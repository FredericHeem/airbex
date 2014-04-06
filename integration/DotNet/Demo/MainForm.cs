namespace Snow.Client.Demo
{
    using System;
    using System.Collections.Generic;
    using System.ComponentModel;
    using System.Data;
    using System.Drawing;
    using System.Globalization;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;
    using System.Windows.Forms;

    public partial class MainForm : Form
    {
        private SnowServiceClient client;
        public MainForm()
        {
            InitializeComponent();
        }

        private void createClientBtn_Click(object sender, EventArgs e)
        {
            if (this.client != null)
            {
                this.client.Close();
            }

            this.client = new SnowServiceClient(this.endpointUrlTxt.Text);

            if (!string.IsNullOrEmpty(this.apiKeyTxt.Text))
            {
                this.client.ApiKey = this.apiKeyTxt.Text;
            }
        }

        private void refreshMarketsBtn_Click(object sender, EventArgs e)
        {
            this.marketsLv.Items.Clear();

            var markets = this.client.GetMarkets();

            this.marketsLv.Items.AddRange(markets.Select(x => new ListViewItem(new[] {
                x.DisplayId,
                x.Last.ToString(),
                x.High.ToString(),
                x.Low.ToString(),
                x.Bid.ToString(),
                x.Ask.ToString(),
                x.Volume.ToString()
            })).ToArray());

            this.marketDepthMarketCb.Items.Clear();
            this.marketDepthMarketCb.Items.AddRange(markets.Select(x => x.Id).ToArray());

            this.createOrderMarketCb.Items.Clear();
            this.createOrderMarketCb.Items.AddRange(markets.Select(x => x.Id).ToArray());
        }

        private void apiKeyTxt_TextChanged(object sender, EventArgs e)
        {
            if (this.client != null) {
                this.client.ApiKey = !string.IsNullOrEmpty(this.apiKeyTxt.Text) ? this.apiKeyTxt.Text : null;
            }
        }

        private void refreshDepthBtn_Click(object sender, EventArgs e)
        {
            var depth = this.client.GetMarketDepth(this.marketDepthMarketCb.Text);

            this.bidsLv.Items.Clear();
            this.asksLv.Items.Clear();

            this.bidsLv.Items.AddRange(depth.Bids.Select(x => new ListViewItem(new[] {
                x.Price.ToString(),
                x.Volume.ToString()
            })).ToArray());

            this.asksLv.Items.AddRange(depth.Asks.Select(x => new ListViewItem(new[] {
                x.Price.ToString(),
                x.Volume.ToString()
            })).ToArray());
        }

        private void refreshOrdersBtn_Click(object sender, EventArgs e)
        {
            var orders = this.client.GetOrders();

            this.ordersLv.Items.Clear();

            this.ordersLv.Items.AddRange(orders.Select(x => new ListViewItem(new[] {
                x.Id.ToString(),
                x.MarketId,
                x.Type.ToString(),
                x.Price == null ? "Any" : x.Price.ToString(),
                x.OriginalAmount.ToString(),
                x.RemainingAmount.ToString()
            })).ToArray());
        }

        private void ordersCtxCancel_Click(object sender, EventArgs e)
        {
            var item = this.ordersLv.SelectedItems.Cast<ListViewItem>().FirstOrDefault();

            if (item == null)
            {
                return;
            }

            this.client.CancelOrder(int.Parse(item.Text, CultureInfo.InvariantCulture));

            this.refreshOrdersBtn_Click(this, EventArgs.Empty);
        }

        private void createOrderBtn_Click(object sender, EventArgs e)
        {
            this.client.CreateOrder(
                this.createOrderMarketCb.Text.Replace("/", ""),
                this.createOrderTypeCb.Text == "Buy" ? OrderType.Bid : OrderType.Ask,
                string.IsNullOrEmpty(this.createOrderPriceTxt.Text) ?
                default(decimal?) : decimal.Parse(this.createOrderPriceTxt.Text, CultureInfo.CurrentCulture),
                decimal.Parse(this.createOrderAmountTxt.Text, CultureInfo.CurrentCulture));

            this.tabControl.SelectedTab = this.ordersTab;

            this.refreshOrdersBtn_Click(this, EventArgs.Empty);
        }

        private void refreshOrderHistoryBtn_Click(object sender, EventArgs e)
        {
            var orders = this.client.GetOrderHistory();

            this.orderHistoryLv.Items.Clear();

            this.orderHistoryLv.Items.AddRange(orders.Select(x => new ListViewItem(new[] {
                x.Id.ToString(),
                x.MarketId,
                x.Type.ToString(),
                x.Price == null ? "Any" : x.Price.ToString(),
                x.OriginalAmount.ToString(),
                x.RemainingAmount.ToString()
            })).ToArray());
        }
    }
}
