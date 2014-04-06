using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.Text;
using System.Threading.Tasks;

namespace Snow.Client
{
    [DataContract]
    public class MarketDepthInternal
    {
        [DataMember(Name = "bids")]
        public IList<IList<decimal>> Bids { get; set; }

        [DataMember(Name = "asks")]
        public IList<IList<decimal>> Asks { get; set; }
    }
}
