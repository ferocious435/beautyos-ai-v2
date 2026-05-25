export const displayProviderName = (provider?: { business_name?: string | null; full_name?: string | null }) => {
  const businessName = provider?.business_name?.trim();
  const fullName = provider?.full_name?.trim();

  if (businessName && !/core admin/i.test(businessName)) return businessName;
  if (fullName) return `${fullName} Studio`;
  return 'BeautyOS Studio';
};
