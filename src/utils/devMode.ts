// Development mode detection
export const isDevMode = (): boolean => {
  // Check if running locally (localhost or 127.0.0.1)
  const isLocalhost = 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1';
  
  // You can add additional checks here if needed
  // For example, you might want to check for specific URL parameters
  const hasDevParam = new URLSearchParams(window.location.search).has('dev');
  
  return isLocalhost || hasDevParam;
};

// Check for URL parameter overrides
const getFeatureOverride = (featureName: string): boolean | null => {
  const params = new URLSearchParams(window.location.search);
  
  // Check for feature-specific parameter (e.g., ?levelSwitcher=true)
  if (params.has(featureName)) {
    return params.get(featureName)?.toLowerCase() === 'true';
  }
  
  // Check for all features parameter (e.g., ?features=true)
  if (params.has('features')) {
    return params.get('features')?.toLowerCase() === 'true';
  }
  
  return null; // No override found
};

// Feature flags with URL parameter override support
export const FEATURES = {
  get LEVEL_SWITCHER(): boolean {
    return getFeatureOverride('levelSwitcher') ?? isDevMode();
  },
  get LEVEL_CREATOR(): boolean {
    return getFeatureOverride('levelCreator') ?? isDevMode();
  },
}; 