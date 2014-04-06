namespace Snow.Client.Demo
{
    partial class MainForm
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            this.components = new System.ComponentModel.Container();
            this.createClientBtn = new System.Windows.Forms.Button();
            this.endpointUrlTxt = new System.Windows.Forms.TextBox();
            this.label1 = new System.Windows.Forms.Label();
            this.apiKeyTxt = new System.Windows.Forms.TextBox();
            this.label2 = new System.Windows.Forms.Label();
            this.tabControl = new System.Windows.Forms.TabControl();
            this.marketsTab = new System.Windows.Forms.TabPage();
            this.refreshMarketsBtn = new System.Windows.Forms.Button();
            this.marketsLv = new System.Windows.Forms.ListView();
            this.columnHeader1 = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.columnHeader2 = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.columnHeader3 = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.columnHeader4 = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.columnHeader5 = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.columnHeader6 = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.columnHeader7 = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.tabPage2 = new System.Windows.Forms.TabPage();
            this.asksLv = new System.Windows.Forms.ListView();
            this.columnHeader10 = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.columnHeader11 = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.label4 = new System.Windows.Forms.Label();
            this.bidsLv = new System.Windows.Forms.ListView();
            this.columnHeader8 = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.columnHeader9 = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.label3 = new System.Windows.Forms.Label();
            this.refreshDepthBtn = new System.Windows.Forms.Button();
            this.marketDepthMarketCb = new System.Windows.Forms.ComboBox();
            this.ordersTab = new System.Windows.Forms.TabPage();
            this.ordersLv = new System.Windows.Forms.ListView();
            this.columnHeader12 = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.columnHeader13 = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.columnHeader14 = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.columnHeader15 = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.columnHeader16 = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.columnHeader17 = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.ordersCtx = new System.Windows.Forms.ContextMenuStrip(this.components);
            this.ordersCtxCancel = new System.Windows.Forms.ToolStripMenuItem();
            this.refreshOrdersBtn = new System.Windows.Forms.Button();
            this.tabPage3 = new System.Windows.Forms.TabPage();
            this.createOrderBtn = new System.Windows.Forms.Button();
            this.createOrderAmountTxt = new System.Windows.Forms.TextBox();
            this.label8 = new System.Windows.Forms.Label();
            this.createOrderPriceTxt = new System.Windows.Forms.TextBox();
            this.label7 = new System.Windows.Forms.Label();
            this.createOrderTypeCb = new System.Windows.Forms.ComboBox();
            this.label6 = new System.Windows.Forms.Label();
            this.createOrderMarketCb = new System.Windows.Forms.ComboBox();
            this.label5 = new System.Windows.Forms.Label();
            this.tabPage1 = new System.Windows.Forms.TabPage();
            this.orderHistoryLv = new System.Windows.Forms.ListView();
            this.columnHeader18 = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.columnHeader19 = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.columnHeader20 = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.columnHeader21 = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.columnHeader22 = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.columnHeader23 = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.refreshOrderHistoryBtn = new System.Windows.Forms.Button();
            this.tabControl.SuspendLayout();
            this.marketsTab.SuspendLayout();
            this.tabPage2.SuspendLayout();
            this.ordersTab.SuspendLayout();
            this.ordersCtx.SuspendLayout();
            this.tabPage3.SuspendLayout();
            this.tabPage1.SuspendLayout();
            this.SuspendLayout();
            // 
            // createClientBtn
            // 
            this.createClientBtn.Location = new System.Drawing.Point(339, 30);
            this.createClientBtn.Name = "createClientBtn";
            this.createClientBtn.Size = new System.Drawing.Size(85, 23);
            this.createClientBtn.TabIndex = 0;
            this.createClientBtn.Text = "Create client";
            this.createClientBtn.UseVisualStyleBackColor = true;
            this.createClientBtn.Click += new System.EventHandler(this.createClientBtn_Click);
            // 
            // endpointUrlTxt
            // 
            this.endpointUrlTxt.Location = new System.Drawing.Point(13, 33);
            this.endpointUrlTxt.Name = "endpointUrlTxt";
            this.endpointUrlTxt.Size = new System.Drawing.Size(320, 20);
            this.endpointUrlTxt.TabIndex = 1;
            this.endpointUrlTxt.Text = "https://justcoin.com/api/";
            // 
            // label1
            // 
            this.label1.AutoSize = true;
            this.label1.Location = new System.Drawing.Point(13, 14);
            this.label1.Name = "label1";
            this.label1.Size = new System.Drawing.Size(71, 13);
            this.label1.TabIndex = 2;
            this.label1.Text = "API endpoint:";
            // 
            // apiKeyTxt
            // 
            this.apiKeyTxt.Location = new System.Drawing.Point(12, 84);
            this.apiKeyTxt.Name = "apiKeyTxt";
            this.apiKeyTxt.Size = new System.Drawing.Size(411, 20);
            this.apiKeyTxt.TabIndex = 3;
            this.apiKeyTxt.TextChanged += new System.EventHandler(this.apiKeyTxt_TextChanged);
            // 
            // label2
            // 
            this.label2.AutoSize = true;
            this.label2.Location = new System.Drawing.Point(13, 65);
            this.label2.Name = "label2";
            this.label2.Size = new System.Drawing.Size(90, 13);
            this.label2.TabIndex = 4;
            this.label2.Text = "API key (optional)";
            // 
            // tabControl
            // 
            this.tabControl.Controls.Add(this.marketsTab);
            this.tabControl.Controls.Add(this.tabPage2);
            this.tabControl.Controls.Add(this.ordersTab);
            this.tabControl.Controls.Add(this.tabPage3);
            this.tabControl.Controls.Add(this.tabPage1);
            this.tabControl.Location = new System.Drawing.Point(12, 128);
            this.tabControl.Name = "tabControl";
            this.tabControl.SelectedIndex = 0;
            this.tabControl.Size = new System.Drawing.Size(478, 311);
            this.tabControl.TabIndex = 5;
            // 
            // marketsTab
            // 
            this.marketsTab.Controls.Add(this.refreshMarketsBtn);
            this.marketsTab.Controls.Add(this.marketsLv);
            this.marketsTab.Location = new System.Drawing.Point(4, 22);
            this.marketsTab.Name = "marketsTab";
            this.marketsTab.Padding = new System.Windows.Forms.Padding(3);
            this.marketsTab.Size = new System.Drawing.Size(470, 285);
            this.marketsTab.TabIndex = 0;
            this.marketsTab.Text = "Markets";
            this.marketsTab.UseVisualStyleBackColor = true;
            // 
            // refreshMarketsBtn
            // 
            this.refreshMarketsBtn.Location = new System.Drawing.Point(7, 7);
            this.refreshMarketsBtn.Name = "refreshMarketsBtn";
            this.refreshMarketsBtn.Size = new System.Drawing.Size(75, 23);
            this.refreshMarketsBtn.TabIndex = 1;
            this.refreshMarketsBtn.Text = "&Refresh";
            this.refreshMarketsBtn.UseVisualStyleBackColor = true;
            this.refreshMarketsBtn.Click += new System.EventHandler(this.refreshMarketsBtn_Click);
            // 
            // marketsLv
            // 
            this.marketsLv.Columns.AddRange(new System.Windows.Forms.ColumnHeader[] {
            this.columnHeader1,
            this.columnHeader2,
            this.columnHeader3,
            this.columnHeader4,
            this.columnHeader5,
            this.columnHeader6,
            this.columnHeader7});
            this.marketsLv.Location = new System.Drawing.Point(4, 39);
            this.marketsLv.Name = "marketsLv";
            this.marketsLv.Size = new System.Drawing.Size(460, 240);
            this.marketsLv.TabIndex = 0;
            this.marketsLv.UseCompatibleStateImageBehavior = false;
            this.marketsLv.View = System.Windows.Forms.View.Details;
            // 
            // columnHeader1
            // 
            this.columnHeader1.Text = "Market";
            // 
            // columnHeader2
            // 
            this.columnHeader2.Text = "Last";
            // 
            // columnHeader3
            // 
            this.columnHeader3.Text = "High";
            // 
            // columnHeader4
            // 
            this.columnHeader4.Text = "Low";
            // 
            // columnHeader5
            // 
            this.columnHeader5.Text = "Bid";
            // 
            // columnHeader6
            // 
            this.columnHeader6.Text = "Ask";
            // 
            // columnHeader7
            // 
            this.columnHeader7.Text = "Volume";
            // 
            // tabPage2
            // 
            this.tabPage2.Controls.Add(this.asksLv);
            this.tabPage2.Controls.Add(this.label4);
            this.tabPage2.Controls.Add(this.bidsLv);
            this.tabPage2.Controls.Add(this.label3);
            this.tabPage2.Controls.Add(this.refreshDepthBtn);
            this.tabPage2.Controls.Add(this.marketDepthMarketCb);
            this.tabPage2.Location = new System.Drawing.Point(4, 22);
            this.tabPage2.Name = "tabPage2";
            this.tabPage2.Padding = new System.Windows.Forms.Padding(3);
            this.tabPage2.Size = new System.Drawing.Size(470, 285);
            this.tabPage2.TabIndex = 1;
            this.tabPage2.Text = "Depth";
            this.tabPage2.UseVisualStyleBackColor = true;
            // 
            // asksLv
            // 
            this.asksLv.Columns.AddRange(new System.Windows.Forms.ColumnHeader[] {
            this.columnHeader10,
            this.columnHeader11});
            this.asksLv.Location = new System.Drawing.Point(241, 60);
            this.asksLv.Name = "asksLv";
            this.asksLv.Size = new System.Drawing.Size(223, 219);
            this.asksLv.TabIndex = 5;
            this.asksLv.UseCompatibleStateImageBehavior = false;
            this.asksLv.View = System.Windows.Forms.View.Details;
            // 
            // columnHeader10
            // 
            this.columnHeader10.Text = "Price";
            // 
            // columnHeader11
            // 
            this.columnHeader11.Text = "Volume";
            this.columnHeader11.Width = 90;
            // 
            // label4
            // 
            this.label4.AutoSize = true;
            this.label4.Location = new System.Drawing.Point(238, 44);
            this.label4.Name = "label4";
            this.label4.Size = new System.Drawing.Size(33, 13);
            this.label4.TabIndex = 4;
            this.label4.Text = "Asks:";
            // 
            // bidsLv
            // 
            this.bidsLv.Columns.AddRange(new System.Windows.Forms.ColumnHeader[] {
            this.columnHeader8,
            this.columnHeader9});
            this.bidsLv.Location = new System.Drawing.Point(10, 60);
            this.bidsLv.Name = "bidsLv";
            this.bidsLv.Size = new System.Drawing.Size(225, 219);
            this.bidsLv.TabIndex = 3;
            this.bidsLv.UseCompatibleStateImageBehavior = false;
            this.bidsLv.View = System.Windows.Forms.View.Details;
            // 
            // columnHeader8
            // 
            this.columnHeader8.Text = "Price";
            // 
            // columnHeader9
            // 
            this.columnHeader9.Text = "Volume";
            this.columnHeader9.Width = 90;
            // 
            // label3
            // 
            this.label3.AutoSize = true;
            this.label3.Location = new System.Drawing.Point(7, 43);
            this.label3.Name = "label3";
            this.label3.Size = new System.Drawing.Size(30, 13);
            this.label3.TabIndex = 2;
            this.label3.Text = "Bids:";
            // 
            // refreshDepthBtn
            // 
            this.refreshDepthBtn.Location = new System.Drawing.Point(134, 4);
            this.refreshDepthBtn.Name = "refreshDepthBtn";
            this.refreshDepthBtn.Size = new System.Drawing.Size(75, 23);
            this.refreshDepthBtn.TabIndex = 1;
            this.refreshDepthBtn.Text = "&Refresh";
            this.refreshDepthBtn.UseVisualStyleBackColor = true;
            this.refreshDepthBtn.Click += new System.EventHandler(this.refreshDepthBtn_Click);
            // 
            // marketDepthMarketCb
            // 
            this.marketDepthMarketCb.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList;
            this.marketDepthMarketCb.FormattingEnabled = true;
            this.marketDepthMarketCb.Location = new System.Drawing.Point(6, 6);
            this.marketDepthMarketCb.Name = "marketDepthMarketCb";
            this.marketDepthMarketCb.Size = new System.Drawing.Size(121, 21);
            this.marketDepthMarketCb.TabIndex = 0;
            // 
            // ordersTab
            // 
            this.ordersTab.Controls.Add(this.ordersLv);
            this.ordersTab.Controls.Add(this.refreshOrdersBtn);
            this.ordersTab.Location = new System.Drawing.Point(4, 22);
            this.ordersTab.Name = "ordersTab";
            this.ordersTab.Padding = new System.Windows.Forms.Padding(3);
            this.ordersTab.Size = new System.Drawing.Size(470, 285);
            this.ordersTab.TabIndex = 2;
            this.ordersTab.Text = "Orders";
            this.ordersTab.UseVisualStyleBackColor = true;
            // 
            // ordersLv
            // 
            this.ordersLv.Columns.AddRange(new System.Windows.Forms.ColumnHeader[] {
            this.columnHeader12,
            this.columnHeader13,
            this.columnHeader14,
            this.columnHeader15,
            this.columnHeader16,
            this.columnHeader17});
            this.ordersLv.ContextMenuStrip = this.ordersCtx;
            this.ordersLv.Location = new System.Drawing.Point(7, 37);
            this.ordersLv.Name = "ordersLv";
            this.ordersLv.Size = new System.Drawing.Size(457, 242);
            this.ordersLv.TabIndex = 1;
            this.ordersLv.UseCompatibleStateImageBehavior = false;
            this.ordersLv.View = System.Windows.Forms.View.Details;
            // 
            // columnHeader12
            // 
            this.columnHeader12.Text = "ID";
            // 
            // columnHeader13
            // 
            this.columnHeader13.Text = "Market";
            // 
            // columnHeader14
            // 
            this.columnHeader14.Text = "Type";
            // 
            // columnHeader15
            // 
            this.columnHeader15.Text = "Price";
            // 
            // columnHeader16
            // 
            this.columnHeader16.Text = "Amount";
            // 
            // columnHeader17
            // 
            this.columnHeader17.Text = "Remaining";
            this.columnHeader17.Width = 70;
            // 
            // ordersCtx
            // 
            this.ordersCtx.Items.AddRange(new System.Windows.Forms.ToolStripItem[] {
            this.ordersCtxCancel});
            this.ordersCtx.Name = "ordersCtx";
            this.ordersCtx.Size = new System.Drawing.Size(111, 26);
            // 
            // ordersCtxCancel
            // 
            this.ordersCtxCancel.Name = "ordersCtxCancel";
            this.ordersCtxCancel.Size = new System.Drawing.Size(110, 22);
            this.ordersCtxCancel.Text = "&Cancel";
            this.ordersCtxCancel.Click += new System.EventHandler(this.ordersCtxCancel_Click);
            // 
            // refreshOrdersBtn
            // 
            this.refreshOrdersBtn.Location = new System.Drawing.Point(7, 7);
            this.refreshOrdersBtn.Name = "refreshOrdersBtn";
            this.refreshOrdersBtn.Size = new System.Drawing.Size(75, 23);
            this.refreshOrdersBtn.TabIndex = 0;
            this.refreshOrdersBtn.Text = "&Refresh";
            this.refreshOrdersBtn.UseVisualStyleBackColor = true;
            this.refreshOrdersBtn.Click += new System.EventHandler(this.refreshOrdersBtn_Click);
            // 
            // tabPage3
            // 
            this.tabPage3.Controls.Add(this.createOrderBtn);
            this.tabPage3.Controls.Add(this.createOrderAmountTxt);
            this.tabPage3.Controls.Add(this.label8);
            this.tabPage3.Controls.Add(this.createOrderPriceTxt);
            this.tabPage3.Controls.Add(this.label7);
            this.tabPage3.Controls.Add(this.createOrderTypeCb);
            this.tabPage3.Controls.Add(this.label6);
            this.tabPage3.Controls.Add(this.createOrderMarketCb);
            this.tabPage3.Controls.Add(this.label5);
            this.tabPage3.Location = new System.Drawing.Point(4, 22);
            this.tabPage3.Name = "tabPage3";
            this.tabPage3.Padding = new System.Windows.Forms.Padding(3);
            this.tabPage3.Size = new System.Drawing.Size(470, 285);
            this.tabPage3.TabIndex = 3;
            this.tabPage3.Text = "Create order";
            this.tabPage3.UseVisualStyleBackColor = true;
            // 
            // createOrderBtn
            // 
            this.createOrderBtn.Location = new System.Drawing.Point(19, 217);
            this.createOrderBtn.Name = "createOrderBtn";
            this.createOrderBtn.Size = new System.Drawing.Size(121, 23);
            this.createOrderBtn.TabIndex = 8;
            this.createOrderBtn.Text = "&Create order";
            this.createOrderBtn.UseVisualStyleBackColor = true;
            this.createOrderBtn.Click += new System.EventHandler(this.createOrderBtn_Click);
            // 
            // createOrderAmountTxt
            // 
            this.createOrderAmountTxt.Location = new System.Drawing.Point(19, 181);
            this.createOrderAmountTxt.Name = "createOrderAmountTxt";
            this.createOrderAmountTxt.Size = new System.Drawing.Size(121, 20);
            this.createOrderAmountTxt.TabIndex = 7;
            // 
            // label8
            // 
            this.label8.AutoSize = true;
            this.label8.Location = new System.Drawing.Point(16, 164);
            this.label8.Name = "label8";
            this.label8.Size = new System.Drawing.Size(46, 13);
            this.label8.TabIndex = 6;
            this.label8.Text = "Amount:";
            // 
            // createOrderPriceTxt
            // 
            this.createOrderPriceTxt.Location = new System.Drawing.Point(19, 132);
            this.createOrderPriceTxt.Name = "createOrderPriceTxt";
            this.createOrderPriceTxt.Size = new System.Drawing.Size(121, 20);
            this.createOrderPriceTxt.TabIndex = 5;
            // 
            // label7
            // 
            this.label7.AutoSize = true;
            this.label7.Location = new System.Drawing.Point(16, 115);
            this.label7.Name = "label7";
            this.label7.Size = new System.Drawing.Size(77, 13);
            this.label7.TabIndex = 4;
            this.label7.Text = "Price (optional)";
            // 
            // createOrderTypeCb
            // 
            this.createOrderTypeCb.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList;
            this.createOrderTypeCb.FormattingEnabled = true;
            this.createOrderTypeCb.Items.AddRange(new object[] {
            "Buy",
            "Sell"});
            this.createOrderTypeCb.Location = new System.Drawing.Point(19, 81);
            this.createOrderTypeCb.Name = "createOrderTypeCb";
            this.createOrderTypeCb.Size = new System.Drawing.Size(121, 21);
            this.createOrderTypeCb.TabIndex = 3;
            // 
            // label6
            // 
            this.label6.AutoSize = true;
            this.label6.Location = new System.Drawing.Point(16, 64);
            this.label6.Name = "label6";
            this.label6.Size = new System.Drawing.Size(34, 13);
            this.label6.TabIndex = 2;
            this.label6.Text = "Type:";
            // 
            // createOrderMarketCb
            // 
            this.createOrderMarketCb.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList;
            this.createOrderMarketCb.FormattingEnabled = true;
            this.createOrderMarketCb.Location = new System.Drawing.Point(19, 34);
            this.createOrderMarketCb.Name = "createOrderMarketCb";
            this.createOrderMarketCb.Size = new System.Drawing.Size(121, 21);
            this.createOrderMarketCb.TabIndex = 1;
            // 
            // label5
            // 
            this.label5.AutoSize = true;
            this.label5.Location = new System.Drawing.Point(16, 17);
            this.label5.Name = "label5";
            this.label5.Size = new System.Drawing.Size(40, 13);
            this.label5.TabIndex = 0;
            this.label5.Text = "Market";
            // 
            // tabPage1
            // 
            this.tabPage1.Controls.Add(this.orderHistoryLv);
            this.tabPage1.Controls.Add(this.refreshOrderHistoryBtn);
            this.tabPage1.Location = new System.Drawing.Point(4, 22);
            this.tabPage1.Name = "tabPage1";
            this.tabPage1.Padding = new System.Windows.Forms.Padding(3);
            this.tabPage1.Size = new System.Drawing.Size(470, 285);
            this.tabPage1.TabIndex = 4;
            this.tabPage1.Text = "Order history";
            this.tabPage1.UseVisualStyleBackColor = true;
            // 
            // orderHistoryLv
            // 
            this.orderHistoryLv.Columns.AddRange(new System.Windows.Forms.ColumnHeader[] {
            this.columnHeader18,
            this.columnHeader19,
            this.columnHeader20,
            this.columnHeader21,
            this.columnHeader22,
            this.columnHeader23});
            this.orderHistoryLv.Location = new System.Drawing.Point(7, 36);
            this.orderHistoryLv.Name = "orderHistoryLv";
            this.orderHistoryLv.Size = new System.Drawing.Size(457, 242);
            this.orderHistoryLv.TabIndex = 3;
            this.orderHistoryLv.UseCompatibleStateImageBehavior = false;
            this.orderHistoryLv.View = System.Windows.Forms.View.Details;
            // 
            // columnHeader18
            // 
            this.columnHeader18.Text = "ID";
            // 
            // columnHeader19
            // 
            this.columnHeader19.Text = "Market";
            // 
            // columnHeader20
            // 
            this.columnHeader20.Text = "Type";
            // 
            // columnHeader21
            // 
            this.columnHeader21.Text = "Price";
            // 
            // columnHeader22
            // 
            this.columnHeader22.Text = "Amount";
            // 
            // columnHeader23
            // 
            this.columnHeader23.Text = "Remaining";
            this.columnHeader23.Width = 70;
            // 
            // refreshOrderHistoryBtn
            // 
            this.refreshOrderHistoryBtn.Location = new System.Drawing.Point(7, 6);
            this.refreshOrderHistoryBtn.Name = "refreshOrderHistoryBtn";
            this.refreshOrderHistoryBtn.Size = new System.Drawing.Size(75, 23);
            this.refreshOrderHistoryBtn.TabIndex = 2;
            this.refreshOrderHistoryBtn.Text = "&Refresh";
            this.refreshOrderHistoryBtn.UseVisualStyleBackColor = true;
            this.refreshOrderHistoryBtn.Click += new System.EventHandler(this.refreshOrderHistoryBtn_Click);
            // 
            // MainForm
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(6F, 13F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(502, 451);
            this.Controls.Add(this.tabControl);
            this.Controls.Add(this.label2);
            this.Controls.Add(this.apiKeyTxt);
            this.Controls.Add(this.label1);
            this.Controls.Add(this.endpointUrlTxt);
            this.Controls.Add(this.createClientBtn);
            this.Name = "MainForm";
            this.Text = "Snow Client Demo";
            this.tabControl.ResumeLayout(false);
            this.marketsTab.ResumeLayout(false);
            this.tabPage2.ResumeLayout(false);
            this.tabPage2.PerformLayout();
            this.ordersTab.ResumeLayout(false);
            this.ordersCtx.ResumeLayout(false);
            this.tabPage3.ResumeLayout(false);
            this.tabPage3.PerformLayout();
            this.tabPage1.ResumeLayout(false);
            this.ResumeLayout(false);
            this.PerformLayout();

        }

        #endregion

        private System.Windows.Forms.Button createClientBtn;
        private System.Windows.Forms.TextBox endpointUrlTxt;
        private System.Windows.Forms.Label label1;
        private System.Windows.Forms.TextBox apiKeyTxt;
        private System.Windows.Forms.Label label2;
        private System.Windows.Forms.TabControl tabControl;
        private System.Windows.Forms.TabPage marketsTab;
        private System.Windows.Forms.TabPage tabPage2;
        private System.Windows.Forms.ListView marketsLv;
        private System.Windows.Forms.Button refreshMarketsBtn;
        private System.Windows.Forms.ColumnHeader columnHeader1;
        private System.Windows.Forms.ColumnHeader columnHeader2;
        private System.Windows.Forms.ColumnHeader columnHeader3;
        private System.Windows.Forms.ColumnHeader columnHeader4;
        private System.Windows.Forms.ColumnHeader columnHeader5;
        private System.Windows.Forms.ColumnHeader columnHeader6;
        private System.Windows.Forms.ColumnHeader columnHeader7;
        private System.Windows.Forms.ComboBox marketDepthMarketCb;
        private System.Windows.Forms.Button refreshDepthBtn;
        private System.Windows.Forms.ListView asksLv;
        private System.Windows.Forms.ColumnHeader columnHeader10;
        private System.Windows.Forms.ColumnHeader columnHeader11;
        private System.Windows.Forms.Label label4;
        private System.Windows.Forms.ListView bidsLv;
        private System.Windows.Forms.ColumnHeader columnHeader8;
        private System.Windows.Forms.ColumnHeader columnHeader9;
        private System.Windows.Forms.Label label3;
        private System.Windows.Forms.TabPage ordersTab;
        private System.Windows.Forms.Button refreshOrdersBtn;
        private System.Windows.Forms.ListView ordersLv;
        private System.Windows.Forms.ColumnHeader columnHeader12;
        private System.Windows.Forms.ColumnHeader columnHeader13;
        private System.Windows.Forms.ColumnHeader columnHeader14;
        private System.Windows.Forms.ColumnHeader columnHeader15;
        private System.Windows.Forms.ColumnHeader columnHeader16;
        private System.Windows.Forms.ColumnHeader columnHeader17;
        private System.Windows.Forms.ContextMenuStrip ordersCtx;
        private System.Windows.Forms.ToolStripMenuItem ordersCtxCancel;
        private System.Windows.Forms.TabPage tabPage3;
        private System.Windows.Forms.ComboBox createOrderTypeCb;
        private System.Windows.Forms.Label label6;
        private System.Windows.Forms.ComboBox createOrderMarketCb;
        private System.Windows.Forms.Label label5;
        private System.Windows.Forms.Label label7;
        private System.Windows.Forms.TextBox createOrderPriceTxt;
        private System.Windows.Forms.Label label8;
        private System.Windows.Forms.TextBox createOrderAmountTxt;
        private System.Windows.Forms.Button createOrderBtn;
        private System.Windows.Forms.TabPage tabPage1;
        private System.Windows.Forms.ListView orderHistoryLv;
        private System.Windows.Forms.ColumnHeader columnHeader18;
        private System.Windows.Forms.ColumnHeader columnHeader19;
        private System.Windows.Forms.ColumnHeader columnHeader20;
        private System.Windows.Forms.ColumnHeader columnHeader21;
        private System.Windows.Forms.ColumnHeader columnHeader22;
        private System.Windows.Forms.ColumnHeader columnHeader23;
        private System.Windows.Forms.Button refreshOrderHistoryBtn;
    }
}

