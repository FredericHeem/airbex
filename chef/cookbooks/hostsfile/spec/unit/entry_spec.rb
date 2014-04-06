require 'spec_helper'

describe Entry do
  describe '.parse' do
    it 'returns nil for invalid lines' do
      expect(Entry.parse('  ')).to be_nil
    end

    context '' do
      let(:entry) { double('entry') }

      before do
        Entry.stub(:new).and_return(entry)
      end

      it 'parses just an ip_address and hostname' do
        Entry.should_receive(:new).with(:ip_address => '1.2.3.4', :hostname => 'www.example.com', :aliases => [], :comment => nil, :priority => nil)
        Entry.parse('1.2.3.4      www.example.com')
      end

      it 'parses aliases' do
        Entry.should_receive(:new).with(:ip_address => '1.2.3.4', :hostname => 'www.example.com', :aliases => ['foo', 'bar'], :comment => nil, :priority => nil)
        Entry.parse('1.2.3.4      www.example.com foo bar')
      end

      it 'parses a comment' do
        Entry.should_receive(:new).with(:ip_address => '1.2.3.4', :hostname => 'www.example.com', :aliases => [], :comment => 'This is a comment!', :priority => nil)
        Entry.parse('1.2.3.4      www.example.com     # This is a comment!')
      end

      it 'parses aliases and comments' do
        Entry.should_receive(:new).with(:ip_address => '1.2.3.4', :hostname => 'www.example.com', :aliases => ['foo', 'bar'], :comment => 'This is a comment!', :priority => nil)
        Entry.parse('1.2.3.4      www.example.com foo bar     # This is a comment!')
      end

      it 'parses priorities with comments' do
        Entry.should_receive(:new).with(:ip_address => '1.2.3.4', :hostname => 'www.example.com', :aliases => [], :comment => 'This is a comment!', :priority => '40')
        Entry.parse('1.2.3.4      www.example.com     # This is a comment! @40')
      end

      it 'parses priorities' do
        Entry.should_receive(:new).with(:ip_address => '1.2.3.4', :hostname => 'www.example.com', :aliases => [], :comment => nil, :priority => '40')
        Entry.parse('1.2.3.4      www.example.com     # @40')
      end
    end
  end

  describe '.initialize' do
    subject { Entry.new(:ip_address => '2.3.4.5', :hostname => 'www.example.com', :aliases => ['foo', 'bar'], :comment => 'This is a comment!', :priority => 100) }

    it 'raises an exception if :ip_address is missing' do
      expect {
        Entry.new(:hostname => 'www.example.com')
      }.to raise_error(ArgumentError)
    end

    it 'raises an exception if :hostname is missing' do
      expect {
        Entry.new(:ip_address => '2.3.4.5')
      }.to raise_error(ArgumentError)
    end

    it 'sets the @ip_address instance variable' do
      expect(subject.ip_address).to be_a(IPAddr)
      expect(subject.ip_address).to eq(IPAddr.new('2.3.4.5'))
    end

    it 'sets the @hostname instance variable' do
      expect(subject.hostname).to eq('www.example.com')
    end

    it 'sets the @aliases instance variable' do
      expect(subject.aliases).to be_a(Array)
      expect(subject.aliases).to eq(['foo', 'bar'])
    end

    it 'sets the @comment instance variable' do
      expect(subject.comment).to eq('This is a comment!')
    end

    it 'sets the @priority instance variable' do
      expect(subject.priority).to eq(100)
    end

    context 'with no options' do
      subject { Entry.new(:ip_address => '2.3.4.5', :hostname => 'www.example.com') }

      it 'sets @aliases to an empty array' do
        expect(subject.aliases).to be_empty
      end

      it 'sets @comment to nil' do
        expect(subject.comment).to be_nil
      end

      it 'calls calculated_priority for @priority' do
        Entry.any_instance.should_receive(:calculated_priority)
        Entry.new(:ip_address => '2.3.4.5', :hostname => 'www.example.com')
      end
    end

    context 'with aliases as a string' do
      subject { Entry.new(:ip_address => '2.3.4.5', :hostname => 'www.example.com', :aliases => 'foo') }

      it 'sets the @aliases to be an Array' do
        expect(subject.aliases).to be_a(Array)
        expect(subject.aliases).to eq(['foo'])
      end
    end
  end

  describe '#priority=' do
    subject { Entry.new(:ip_address => '2.3.4.5', :hostname => 'www.example.com') }

    it 'sets the new priority' do
      subject.priority = 50
      expect(subject.priority).to eq(50)
    end

    it 'sets @calculated_priority to false' do
      subject.priority = 50
      expect(subject.instance_variable_get(:@calculated_priority)).to be_false
    end
  end

  describe '#to_line' do
    context 'without a comment' do
      subject { Entry.new(:ip_address => '2.3.4.5', :hostname => 'www.example.com') }

      it 'prints without aliases' do
        expect(subject.to_line).to eq("2.3.4.5\twww.example.com")
      end

      it 'prints with aliases' do
        subject.aliases << 'foo'
        expect(subject.to_line).to eq("2.3.4.5\twww.example.com foo")
      end

      it 'prints out the priority' do
        subject.priority = 10
        expect(subject.to_line).to eq("2.3.4.5\twww.example.com\t# @10")
      end
    end

    context 'with a comment' do
      subject { Entry.new(:ip_address => '2.3.4.5', :hostname => 'www.example.com', :comment => 'This is a comment!') }

      it 'prints without aliases' do
        expect(subject.to_line).to eq("2.3.4.5\twww.example.com\t# This is a comment!")
      end

      it 'prints with aliases' do
        subject.aliases << 'foo'
        expect(subject.to_line).to eq("2.3.4.5\twww.example.com foo\t# This is a comment!")
      end

      it 'prints out the priority' do
        subject.priority = 10
        expect(subject.to_line).to eq("2.3.4.5\twww.example.com\t# This is a comment! @10")
      end
    end
  end

  describe '#to_s' do
    subject { Entry.new(:ip_address => '2.3.4.5', :hostname => 'www.example.com') }

    it 'prints correctly' do
      expect(subject.to_s).to eq("#<Entry ip_address: '2.3.4.5', hostname: 'www.example.com'>")
    end

    it 'prints without aliases' do
      subject.aliases << 'foo'
      expect(subject.to_s).to eq("#<Entry ip_address: '2.3.4.5', hostname: 'www.example.com'>")
    end

    it 'prints without a priority' do
      subject.priority = 10
      expect(subject.to_s).to eq("#<Entry ip_address: '2.3.4.5', hostname: 'www.example.com'>")
    end

    it 'prints without comments' do
      subject.comment = "This is a comment"
      expect(subject.to_s).to eq("#<Entry ip_address: '2.3.4.5', hostname: 'www.example.com'>")
    end
  end

  describe '#inspect' do
    subject { Entry.new(:ip_address => '2.3.4.5', :hostname => 'www.example.com') }

    it 'prints correctly' do
      expect(subject.inspect).to eq("#<Entry ip_address: '2.3.4.5', hostname: 'www.example.com', aliases: [], comment: '', priority: 60, calculated_priority?: true>")
    end

    it 'prints with aliases' do
      subject.aliases << 'foo'
      expect(subject.inspect).to eq("#<Entry ip_address: '2.3.4.5', hostname: 'www.example.com', aliases: [\"foo\"], comment: '', priority: 60, calculated_priority?: true>")
    end

    it 'prints with a priority' do
      subject.priority = 10
      expect(subject.inspect).to eq("#<Entry ip_address: '2.3.4.5', hostname: 'www.example.com', aliases: [], comment: '', priority: 10, calculated_priority?: false>")
    end

    it 'prints with comments' do
      subject.comment = "This is a comment"
      expect(subject.inspect).to eq("#<Entry ip_address: '2.3.4.5', hostname: 'www.example.com', aliases: [], comment: 'This is a comment', priority: 60, calculated_priority?: true>")
    end
  end
end
