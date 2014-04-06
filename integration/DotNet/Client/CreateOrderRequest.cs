using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Runtime.Serialization;
using System.Text;
using System.Threading.Tasks;

namespace Snow.Client
{
    [DataContract]
    public class CreateOrderRequest
    {
        [DataMember(Name = "market")]
        public string MarketId { get; set; }

        [DataMember(Name = "price")]
        private string price;

        [DataMember(Name = "amount")]
        private string amount;

        public decimal? Price
        {
            set
            {
                this.price = value.HasValue ? value.Value.ToString(CultureInfo.InvariantCulture) : null;
            }
        }

        public decimal Amount
        {
            set
            {
                this.amount = value.ToString(CultureInfo.InvariantCulture);
            }
        }

        [DataMember]
        private string type;

        public OrderType Type
        {
            set
            {
                this.type = value == OrderType.Bid ? "bid" : "ask";
            }
        }
    }
}
