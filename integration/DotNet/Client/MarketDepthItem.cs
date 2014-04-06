namespace Snow.Client
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public class MarketDepthItem
    {
        public decimal Price { get; set; }
        public decimal Volume { get; set; }

        public override string ToString()
        {
            return this.Volume + " @ " + this.Price;
        }
    }
}
