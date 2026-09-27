// Read-only coverage audit against the LIVE code catalog, not the old snapshot.
// Exit 2 means a product is unclassified, ambiguous, or its evidence is stale; candidate source references are not proof.
import { buildPaidDeliveryInventory, inventoryIsComplete } from './lib/paid-delivery-inventory.mjs';
const report=buildPaidDeliveryInventory();
console.log(JSON.stringify(report,null,2));
if(!inventoryIsComplete(report))process.exitCode=2;
