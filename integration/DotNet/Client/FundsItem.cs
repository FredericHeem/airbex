using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.Text;
using System.Threading.Tasks;

namespace Snow.Client
{
    [DataContract]
    public class FundsItem
    {
        [DataMember(Name = "currency")]
        public string Currency { get; set; }

        [DataMember(Name = "available")]
        public decimal Available { get; set; }

        [DataMember(Name = "balance")]
        public decimal Balance { get; set; }

        [DataMember(Name = "hold")]
        public decimal Hold { get; set; }

        public override string ToString()
        {
            return string.Format("{0} {1}{2}",
                this.Balance,
                this.Currency,
                this.Hold > 0 ? string.Format(" ({0} {1} available)", this.Available, this.Currency) : string.Empty);
        }
    }
}
