import { Injectable } from '@angular/core';
import PouchDB from 'pouchdb-browser';

export interface DbSyncConfig {
  url: string;
  username: string;
  password: string;
  enabled: boolean;
}

const CONFIG_KEY = 'lw_db_config';

const DEFAULT_CONFIG: DbSyncConfig = {
  url: '',
  username: '',
  password: '',
  enabled: false,
};

/** Single document stored in PouchDB containing all app data. */
interface AppDoc {
  _id: 'app_data';
  _rev?: string;
  users: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class DbService {
  private db: PouchDB.Database<AppDoc>;
  private syncHandler: PouchDB.Replication.Sync<Record<string, unknown>> | null = null;
  private rev: string | undefined;

  /**
   * Resolves once the local PouchDB has been read and any existing data has
   * been merged back into localStorage so StorageService can read it.
   */
  readonly initialized: Promise<void>;

  constructor() {
    this.db = new PouchDB('learnwise');
    this.initialized = this.init();
  }

  // ---------------------------------------------------------------------------
  // Initialisation
  // ---------------------------------------------------------------------------

  private async init(): Promise<void> {
    try {
      const doc = await this.db.get<AppDoc>('app_data');
      this.rev = doc._rev;
      // Restore users from PouchDB into localStorage so StorageService picks them up
      if (doc.users && Object.keys(doc.users).length > 0) {
        localStorage.setItem('lw_users', JSON.stringify(doc.users));
      }
    } catch (e: any) {
      if (e.status !== 404) {
        console.warn('[DbService] PouchDB init error:', e);
      }
      // 404 = first run; migrate existing localStorage data into PouchDB
      await this.migrateFromLocalStorage();
    }

    // Wire up CouchDB sync if already configured
    const cfg = this.getSyncConfig();
    if (cfg.enabled && cfg.url) {
      this.startSync(cfg);
    }
  }

  private async migrateFromLocalStorage(): Promise<void> {
    try {
      const raw = localStorage.getItem('lw_users');
      const users = raw ? JSON.parse(raw) : {};
      await this.persistUsers(users);
    } catch (e) {
      console.warn('[DbService] Migration error:', e);
    }
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  /** Write the full users dict to PouchDB (fire-and-forget safe). */
  async persistUsers(users: Record<string, unknown>): Promise<void> {
    try {
      const doc: AppDoc = { _id: 'app_data', _rev: this.rev, users };
      const result = await this.db.put(doc);
      this.rev = result.rev;
    } catch (e: any) {
      if (e.status === 409) {
        // Conflict — fetch latest rev and retry once
        try {
          const existing = await this.db.get<AppDoc>('app_data');
          this.rev = existing._rev;
          const result = await this.db.put({ _id: 'app_data', _rev: this.rev, users });
          this.rev = result.rev;
        } catch (retryErr) {
          console.warn('[DbService] Conflict retry failed:', retryErr);
        }
      } else {
        console.warn('[DbService] persistUsers error:', e);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Sync config (stored in localStorage — not synced, intentionally)
  // ---------------------------------------------------------------------------

  getSyncConfig(): DbSyncConfig {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  saveSyncConfig(cfg: DbSyncConfig): void {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
    if (cfg.enabled && cfg.url) {
      this.startSync(cfg);
    } else {
      this.stopSync();
    }
  }

  // ---------------------------------------------------------------------------
  // Live sync with CouchDB
  // ---------------------------------------------------------------------------

  startSync(cfg: DbSyncConfig): void {
    this.stopSync();

    // Build URL with credentials if provided
    let syncUrl = cfg.url;
    if (cfg.username && cfg.password) {
      try {
        const u = new URL(cfg.url);
        u.username = cfg.username;
        u.password = cfg.password;
        syncUrl = u.toString();
      } catch {
        // Invalid URL — proceed without embedding credentials
      }
    }

    this.syncHandler = (this.db as unknown as PouchDB.Database<Record<string, unknown>>)
      .sync(syncUrl, { live: true, retry: true })
      .on('change', async info => {
        // When remote changes arrive, update localStorage so the app stays current
        if (info.direction === 'pull' && info.change.docs_written > 0) {
          try {
            const doc = await this.db.get<AppDoc>('app_data');
            this.rev = doc._rev;
            if (doc.users) {
              localStorage.setItem('lw_users', JSON.stringify(doc.users));
            }
          } catch (e) {
            console.warn('[DbService] Change handler error:', e);
          }
        }
      })
      .on('error', (err: unknown) => {
        console.warn('[DbService] Sync error:', err);
      });
  }

  stopSync(): void {
    if (this.syncHandler) {
      this.syncHandler.cancel();
      this.syncHandler = null;
    }
  }

  get isSyncing(): boolean {
    return this.syncHandler !== null;
  }
}
