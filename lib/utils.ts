// Fonction de hash simple (fonctionne partout)
export async function hashPassword(password: string): Promise<string> {
  // Utilise un hash SHA-256 via l'API Web Crypto (fonctionne en HTTPS)
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  
  try {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    // Fallback : hash simple si crypto.subtle ne fonctionne pas
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}