namespace Snow.Client
{
    using System;
    using System.Collections.Generic;
    using System.IO;
    using System.Json;
    using System.Linq;
    using System.Net;
    using System.ServiceModel;
    using System.ServiceModel.Channels;
    using System.ServiceModel.Description;
    using System.ServiceModel.Dispatcher;
    using System.Text;
    using System.Threading.Tasks;

    public class SnowServiceClient : ClientBase<ISnowService>
    {
        public string ApiKey { get; set; }

        public SnowServiceClient(string endpoint)
            : base(new SnowServiceClientBinding(
                endpoint.StartsWith("https:", StringComparison.InvariantCultureIgnoreCase)),
                new EndpointAddress(endpoint))
        {
            this.Endpoint.EndpointBehaviors.Add(new WebHttpBehavior());
        }

        public IList<MarketsItem> GetMarkets()
        {
            return this.Channel.GetMarkets();
        }

        public MarketDepth GetMarketDepth(string marketId)
        {
            var innerResult = this.Channel.GetMarketDepth(marketId);

            return new MarketDepth
            {
                Bids = innerResult.Bids.Select(x => new MarketDepthItem
                {
                    Price = x[0],
                    Volume = x[1]
                }).ToList(),
                Asks = innerResult.Asks.Select(x => new MarketDepthItem
                {
                    Price = x[0],
                    Volume = x[1]
                }).ToList()
            };
        }

        public IList<OrdersItem> GetOrders()
        {
            return this.Channel.GetOrders(this.ApiKey);
        }

        public IList<OrdersItem> GetOrderHistory()
        {
            return this.Channel.GetOrderHistory(this.ApiKey);
        }

        public IList<FundsItem> GetFunds()
        {
            return this.Channel.GetFunds(this.ApiKey);
        }

        public void CancelOrder(int orderId)
        {
            WrapJsonErrors(() =>
            {
                this.Channel.CancelOrder(this.ApiKey, orderId.ToString());
            });
        }

        private static string ExtractResponseString(WebException webException)
        {
            if (webException.Response == null)
            {
                return null;
            }

            var responseStream = webException.Response.GetResponseStream() as MemoryStream;

            if (responseStream == null)
            {
                return null;
            }

            var responseBytes = responseStream.ToArray();

            return Encoding.UTF8.GetString(responseBytes);
        }

        private T WrapJsonErrors<T>(Func<T> func)
        {
            T result = default(T);

            WrapJsonErrors(() =>
            {
                result = func();
            });

            return result;
        }

        public void WrapJsonErrors(Action action)
        {
            try
            {
                action();
            }
            catch (ProtocolException e)
            {
                var we = e.InnerException as WebException;

                if (we != null)
                {
                    var rawResponse = ExtractResponseString(we);

                    if (rawResponse != null)
                    {
                        dynamic jsonResponse;

                        try
                        {
                            jsonResponse = (JsonObject)JsonValue.Parse(rawResponse);
                        }
                        catch
                        {
                            throw new Exception(rawResponse, e);
                        }

                        throw new SnowServiceException((string)jsonResponse.name, (string)jsonResponse.message);
                    }
                }

                throw;
            }
        }

        public int CreateOrder(string marketId, OrderType type, decimal? price, decimal amount)
        {
            return WrapJsonErrors(() =>
            {
                return this.Channel.CreateOrder(this.ApiKey, new CreateOrderRequest
                {
                    MarketId = marketId,
                    Type = type,
                    Price = price,
                    Amount = amount
                }).Id;
            });
        }
    }
}
