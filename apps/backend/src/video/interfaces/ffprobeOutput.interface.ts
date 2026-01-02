export interface FFProbeRawOutput {
  format?: {
    duration?: string;
    size?: string;
    format_name?: string;
  };
  streams?: Array<{
    codec_type: string;
    width?: number;
    height?: number;
    codec_name?: string;
  }>;
}
