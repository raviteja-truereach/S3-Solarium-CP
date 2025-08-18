/**
 * NetInfo Type Declarations
 * Type definitions for @react-native-community/netinfo
 */
declare module '@react-native-community/netinfo' {
  export interface NetInfoState {
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    type: string;
  }

  export function addEventListener(
    listener: (state: NetInfoState) => void
  ): () => void;

  export function fetch(): Promise<NetInfoState>;
}
