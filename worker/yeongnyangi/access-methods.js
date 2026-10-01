// Stored access methods that let a consultation request generate. The repository re-checks the owner's evidence
// for each one before any chapter is claimed; a method missing from this list never counts as access.
export const NON_CASH_ACCESS_METHODS = Object.freeze(['FAMILY','SERVICE_PACK','MOONLIGHT_STONE','PER_USE','ACCOUNT_FREE_TRIAL']);
export const ACCESS_METHODS = Object.freeze(['DIRECT_KRW', ...NON_CASH_ACCESS_METHODS]);

export const hasRequestAccess = row => Boolean(row?.paymentId || NON_CASH_ACCESS_METHODS.includes(row?.accessMethod) || row?.passEvidenceId || row?.moonstoneLedgerId);
