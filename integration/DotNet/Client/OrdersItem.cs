using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.Text;
using System.Threading.Tasks;

namespace Snow.Client
{
    [DataContract]
    public class OrdersItem
    {
        [DataMember(Name = "id")]
        public int Id { get; set; }

        [DataMember(Name = "market")]
        public string MarketId { get; set; }

        [DataMember(Name = "amount")]
        public decimal OriginalAmount { get; set; }

        [DataMember(Name = "remaining")]
        public decimal RemainingAmount { get; set; }

        [DataMember(Name = "matched")]
        public decimal MatchedAmount { get; set; }

        [DataMember(Name = "cancelled")]
        public decimal CanceledAmount { get; set; }

        [DataMember(Name = "price")]
        public decimal? Price { get; set; }

        [DataMember(Name = "type")]
        private string type;

        public OrderType Type
        {
            get
            {
                return (OrderType)OrderType.Parse(typeof(OrderType), this.type, true);
            }
        }

        public override string ToString()
        {
            return string.Format(
                "{0} {1} {2} @ {3} {4}{5}",
                this.Type == OrderType.Bid ? "BID" : "ASK",
                this.RemainingAmount,
                this.MarketId.Substring(0, 3),
                this.Price.HasValue ? this.Price.ToString() : "Market Price",
                this.MarketId.Substring(3),
                this.Price.HasValue ? string.Format(" ({0} {1})",
                this.RemainingAmount * this.Price.Value, this.MarketId.Substring(3)) : string.Empty);
        }
    }

}
