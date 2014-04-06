using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.Text;
using System.Threading.Tasks;

namespace Snow.Client
{
    [DataContract]
    public class CreateOrderResponse
    {
        [DataMember(Name = "id")]
        public int Id { get; set; }
    }
}
