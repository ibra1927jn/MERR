import Dexie, { Table } from 'dexie';

export class HarvestDB extends Dexie {
    bucket_queue!: Table<any, number>;
    user_cache!: Table<any, string>;
    settings_cache!: Table<any, string>;

    constructor() {
        super('HarvestProDB');
        this.version(4).stores({
            bucket_queue: '++id, picker_id, orchard_id, synced',
            user_cache: 'id',
            settings_cache: 'id'
        }).upgrade(tx => {
            return Promise.all([
                tx.table('user_cache').clear(),
                tx.table('settings_cache').clear()
            ]);
        });
    }
}

export const db = new HarvestDB();

db.open().catch(async (err) => {
    console.error("Dexie Error, reseteando...", err);
    await Dexie.delete('HarvestProDB');
    window.location.reload();
});
