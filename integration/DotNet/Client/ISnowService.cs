namespace Snow.Client
{
    using System;
    using System.Collections.Generic;
    using System.Globalization;
    using System.Linq;
    using System.Runtime.Serialization;
    using System.ServiceModel;
    using System.ServiceModel.Web;
    using System.Text;
    using System.Threading.Tasks;

    [ServiceContract]
    public interface ISnowService
    {
        [OperationContract]
        [WebInvoke(Method = "GET", ResponseFormat = WebMessageFormat.Json, BodyStyle = WebMessageBodyStyle.Bare, UriTemplate = "v1/markets")]
        IList<MarketsItem> GetMarkets();

        [OperationContract]
        [WebInvoke(Method = "GET", ResponseFormat = WebMessageFormat.Json, BodyStyle = WebMessageBodyStyle.Bare, UriTemplate = "v1/markets/{marketId}/depth")]
        MarketDepthInternal GetMarketDepth(string marketId);

        [OperationContract]
        [WebInvoke(Method = "GET", ResponseFormat = WebMessageFormat.Json, BodyStyle = WebMessageBodyStyle.Bare, UriTemplate = "v1/orders?key={apiKey}")]
        IList<OrdersItem> GetOrders(string apiKey);

        [OperationContract]
        [WebInvoke(Method = "GET", ResponseFormat = WebMessageFormat.Json, BodyStyle = WebMessageBodyStyle.Bare, UriTemplate = "v1/orders/history?key={apiKey}")]
        IList<OrdersItem> GetOrderHistory(string apiKey);

        [OperationContract]
        [WebInvoke(Method = "GET", ResponseFormat = WebMessageFormat.Json, BodyStyle = WebMessageBodyStyle.Bare, UriTemplate = "v1/balances?key={apiKey}")]
        IList<FundsItem> GetFunds(string apiKey);

        [OperationContract]
        [WebInvoke(Method = "POST", RequestFormat=WebMessageFormat.Json, ResponseFormat = WebMessageFormat.Json, BodyStyle = WebMessageBodyStyle.Bare, UriTemplate = "v1/orders?key={apiKey}")]
        CreateOrderResponse CreateOrder(string apiKey, CreateOrderRequest item);

        [OperationContract]
        [WebInvoke(Method = "DELETE", UriTemplate = "v1/orders/{orderId}?key={apiKey}")]
        void CancelOrder(string apiKey, string orderId);
    }
}
