using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.Text;
using System.Threading.Tasks;

namespace Snow.Client
{
    [DataContract]
    public class MarketsItem
    {
        [DataMember(Name = "id")]
        public string Id { get; set; }

        [DataMember(Name = "last")]
        public decimal? Last { get; set; }

        [DataMember(Name = "high")]
        public decimal? High { get; set; }

        [DataMember(Name = "low")]
        public decimal? Low { get; set; }

        [DataMember(Name = "bid")]
        public decimal? Bid { get; set; }

        [DataMember(Name = "ask")]
        public decimal? Ask { get; set; }

        [DataMember(Name = "volume")]
        public decimal? Volume { get; set; }

        [DataMember(Name = "scale")]
        public int Scale { get; set; }

        public string DisplayId
        {
            get
            {
                return this.Id.Substring(0, 3) + "/" + this.Id.Substring(3);
            }
        }

        public override string ToString()
        {
            return string.Format(
                "{0}: Last={1}; High={2}; Low={3}; Bid={4}; Ask={5}; Volume={6}",
                this.DisplayId,
                this.Last,
                this.High,
                this.Low,
                this.Bid,
                this.Ask,
                this.Volume);
        }
    }

}
