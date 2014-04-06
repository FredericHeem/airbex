using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Snow.Client
{
    public class SnowServiceException : Exception
    {
        public string Name { get; set; }

        public SnowServiceException(string name, string message)
            : base(name + ": " + message)
        {
            this.Name = name;
        }
    }
}
