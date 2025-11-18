require('dotenv').config();
const supabase = require('./config/supabase');
const webhookService = require('./services/webhookService');

class NexusWorker {
  constructor() {
    this.listeners = new Map();
    this.subscriptions = new Map();
  }

  async start() {
    console.log('🔧 Nexus Event Worker starting...');
    
    await this.loadListeners();
    this.watchListenerChanges();
    
    console.log('✅ Worker ready and listening for events');
  }

  async loadListeners() {
    try {
      const { data, error } = await supabase
        .from('listeners')
        .select('*');

      if (error) throw error;

      console.log(`📋 Loaded ${data.length} listener(s)`);

      this.subscriptions.forEach(sub => sub.unsubscribe());
      this.subscriptions.clear();
      this.listeners.clear();

      for (const listener of data) {
        this.addListener(listener);
      }
    } catch (error) {
      console.error('❌ Error loading listeners:', error);
    }
  }

  addListener(listener) {
    const key = `${listener.source_table}-${listener.event}`;
    
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    
    this.listeners.get(key).push(listener);

    if (!this.subscriptions.has(listener.source_table)) {
      this.subscribeToTable(listener.source_table);
    }

    console.log(`✅ Listener added: "${listener.name}" (${listener.source_table}:${listener.event})`);
  }

  subscribeToTable(tableName) {
    const subscription = supabase
      .channel(`${tableName}-changes`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: tableName 
        },
        (payload) => this.handleDatabaseEvent(tableName, payload)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`👂 Now listening to "${tableName}" table`);
        }
      });

    this.subscriptions.set(tableName, subscription);
  }

  async handleDatabaseEvent(tableName, payload) {
    const eventType = payload.eventType;
    const key = `${tableName}-${eventType}`;

    console.log(`🔔 Event detected: ${eventType} on ${tableName}`);

    const matchingListeners = this.listeners.get(key) || [];

    if (matchingListeners.length === 0) {
      console.log(`⏭️  No listeners configured for ${key}`);
      return;
    }

    console.log(`🎯 Found ${matchingListeners.length} matching listener(s)`);

    for (const listener of matchingListeners) {
      await this.processListener(listener, payload);
    }
  }

  async processListener(listener, payload) {
    console.log(`📤 Processing listener: "${listener.name}"`);

    try {
      const result = await webhookService.send(
        listener.target_url,
        payload.new || payload.old
      );

      await this.logEvent(listener.id, result, payload);

      if (result.success) {
        console.log(`✅ Webhook sent successfully for "${listener.name}"`);
      } else {
        console.log(`❌ Webhook failed for "${listener.name}": ${result.error}`);
      }
    } catch (error) {
      console.error(`❌ Error processing listener "${listener.name}":`, error);
      
      await this.logEvent(listener.id, {
        success: false,
        error: error.message,
      }, payload);
    }
  }

  async logEvent(listenerId, result, payload) {
    try {
      await supabase.from('event_logs').insert([
        {
          listener_id: listenerId,
          status: result.success ? 'SUCCESS' : 'FAILED',
          payload_received: payload,
          response_from_target: JSON.stringify(result),
        },
      ]);
    } catch (error) {
      console.error('❌ Error logging event:', error);
    }
  }

  watchListenerChanges() {
    supabase
      .channel('listener-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'listeners' },
        async (payload) => {
          console.log('🔄 Listener configuration changed, reloading...');
          await this.loadListeners();
        }
      )
      .subscribe();
  }
}

const worker = new NexusWorker();
worker.start().catch((error) => {
  console.error('❌ Fatal error starting worker:', error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down worker...');
  process.exit(0);
});