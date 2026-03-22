import Dexie, { type EntityTable } from 'dexie';
import type { LocalTruck, LocalSlip, LocalPhoto, Draft } from '@/types';

class DespatchDB extends Dexie {
  trucks!: EntityTable<LocalTruck, 'id'>;
  slips!: EntityTable<LocalSlip, 'id'>;
  photos!: EntityTable<LocalPhoto, 'id'>;
  drafts!: EntityTable<Draft, 'id'>;

  constructor() {
    super('despatch-tracker');
    this.version(1).stores({
      trucks: '&id, &reg_no, created_at, synced',
      slips: '&id, truck_id, job_number, scanned_at, synced',
      photos: '&id, slip_id',
    });
    this.version(2).stores({
      trucks: '&id, &reg_no, created_at, synced',
      slips: '&id, truck_id, job_number, scanned_at, synced',
      photos: '&id, slip_id',
      drafts: '&id',
    });
  }
}

export const db = new DespatchDB();

// ── Truck helpers ──

export async function addTruck(truck: LocalTruck): Promise<void> {
  await db.trucks.put(truck);
}

export async function getTrucks(): Promise<LocalTruck[]> {
  return db.trucks.orderBy('created_at').reverse().toArray();
}

export async function getTruckByReg(regNo: string): Promise<LocalTruck | undefined> {
  return db.trucks.where('reg_no').equals(regNo).first();
}

export async function getTruckById(id: string): Promise<LocalTruck | undefined> {
  return db.trucks.get(id);
}

export async function updateTruck(id: string, changes: Partial<LocalTruck>): Promise<void> {
  await db.trucks.update(id, changes);
}

export async function deleteTruck(id: string): Promise<void> {
  await db.transaction('rw', db.trucks, db.slips, db.photos, async () => {
    const slips = await db.slips.where('truck_id').equals(id).toArray();
    const slipIds = slips.map(s => s.id);
    await db.photos.where('slip_id').anyOf(slipIds).delete();
    await db.slips.where('truck_id').equals(id).delete();
    await db.trucks.delete(id);
  });
}

// ── Slip helpers ──

export async function addSlip(slip: LocalSlip): Promise<void> {
  await db.slips.put(slip);
}

export async function getSlipsByTruck(truckId: string): Promise<LocalSlip[]> {
  return db.slips.where('truck_id').equals(truckId).reverse().sortBy('scanned_at');
}

export async function getSlipById(id: string): Promise<LocalSlip | undefined> {
  return db.slips.get(id);
}

export async function updateSlip(id: string, changes: Partial<LocalSlip>): Promise<void> {
  await db.slips.update(id, { ...changes, updated_at: new Date().toISOString() });
}

export async function deleteSlip(id: string): Promise<void> {
  await db.transaction('rw', db.slips, db.photos, async () => {
    await db.photos.where('slip_id').equals(id).delete();
    await db.slips.delete(id);
  });
}

export async function getAllSlips(): Promise<LocalSlip[]> {
  return db.slips.orderBy('scanned_at').reverse().toArray();
}

// ── Photo helpers ──

export async function addPhoto(photo: LocalPhoto): Promise<void> {
  await db.photos.put(photo);
}

export async function getPhotoBySlipId(slipId: string): Promise<LocalPhoto | undefined> {
  return db.photos.where('slip_id').equals(slipId).first();
}

export async function deletePhoto(slipId: string): Promise<void> {
  await db.photos.where('slip_id').equals(slipId).delete();
}

// ── Sync queries ──

export async function getUnsyncedTrucks(): Promise<LocalTruck[]> {
  return db.trucks.where('synced').equals(0).toArray();
}

export async function getUnsyncedSlips(): Promise<LocalSlip[]> {
  return db.slips.where('synced').equals(0).toArray();
}

export async function markTruckSynced(id: string): Promise<void> {
  await db.trucks.update(id, { synced: true });
}

export async function markSlipSynced(id: string, photoUrl: string): Promise<void> {
  await db.slips.update(id, { synced: true, photo_url: photoUrl });
}

// ── Utility ──

export async function getSlipCountForTruck(truckId: string): Promise<number> {
  return db.slips.where('truck_id').equals(truckId).count();
}

export async function checkDuplicateJob(truckId: string, jobNumber: string): Promise<boolean> {
  const existing = await db.slips
    .where('truck_id').equals(truckId)
    .filter(s => s.job_number === jobNumber)
    .first();
  return !!existing;
}

// ── Draft helpers ──

export async function saveDraft(draft: Draft): Promise<void> {
  await db.drafts.put(draft);
}

export async function getDraft(id: string): Promise<Draft | undefined> {
  return db.drafts.get(id);
}

export async function deleteDraft(id: string): Promise<void> {
  await db.drafts.delete(id);
}
