// Utility file for custom alerts
// Import this instead of Alert from react-native to get styled alerts
// Usage: import Alert from '@/utils/alert'; then use Alert.alert() as normal

import { CustomAlert } from "@/components/CustomAlert";

// Export as Alert for drop-in replacement
export default CustomAlert;

// Also export CustomAlert for explicit usage
export { CustomAlert };

