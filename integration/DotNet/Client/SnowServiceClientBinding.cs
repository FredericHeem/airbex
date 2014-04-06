namespace Snow.Client
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.ServiceModel;
    using System.Text;
    using System.Threading.Tasks;

    public class SnowServiceClientBinding : WebHttpBinding
    {
        public SnowServiceClientBinding(bool secure)
            : base(secure ? WebHttpSecurityMode.Transport : WebHttpSecurityMode.None)
        {
        }
    }
}
