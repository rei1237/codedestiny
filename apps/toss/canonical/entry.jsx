// Deliberately outside the production entry graph. No production API fallback.
if(import.meta.env.DEV){
  const {installPreviewTransport}=await import('./transport.js');
  installPreviewTransport();
  await import('./screens.jsx');
}
