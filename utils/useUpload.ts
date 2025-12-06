"use client";

import * as React from "react";

interface UploadResult {
  url: string;
  mimeType?: string;
  public_id?: string;
  format?: string;
  bytes?: number;
  error?: string;
}

interface UploadInput {
  file?: File;
  url?: string;
  base64?: string;
  buffer?: ArrayBuffer;
}

function useUpload() {
  const [loading, setLoading] = React.useState(false);

  const upload = React.useCallback(async (input: UploadInput): Promise<UploadResult> => {
    try {
      setLoading(true);
      
      let response: Response;
      if (input.file) {
        // Handle file upload to Cloudinary
        const formData = new FormData();
        formData.append("file", input.file);
        
        // Get Cloudinary config from environment
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
        
        if (!cloudName || !uploadPreset) {
          throw new Error("Cloudinary configuration is missing");
        }
        
        // Upload to Cloudinary
        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
        response = await fetch(`${cloudinaryUrl}?upload_preset=${uploadPreset}`, {
          method: "POST",
          body: formData,
        });
      } else if (input.url) {
        // Handle URL upload to Cloudinary
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
        
        if (!cloudName || !uploadPreset) {
          throw new Error("Cloudinary configuration is missing");
        }
        
        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
        response = await fetch(`${cloudinaryUrl}?upload_preset=${uploadPreset}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            url: input.url
          }),
        });
      } else if (input.base64) {
        // Handle base64 upload to Cloudinary
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
        
        if (!cloudName || !uploadPreset) {
          throw new Error("Cloudinary configuration is missing");
        }
        
        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
        response = await fetch(`${cloudinaryUrl}?upload_preset=${uploadPreset}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            file: input.base64
          }),
        });
      } else {
        throw new Error("Invalid input: file, url, or base64 required");
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Cloudinary upload error:", errorText);
        
        if (response.status === 413) {
          throw new Error("Upload failed: File too large.");
        }
        if (response.status === 400) {
          throw new Error("Upload failed: Invalid file format or corrupted file.");
        }
        if (response.status === 401) {
          throw new Error("Upload failed: Authentication error.");
        }
        if (response.status === 403) {
          throw new Error("Upload failed: Upload preset configuration error.");
        }
        
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      
      // Return in the same format as before for compatibility
      return { 
        url: data.secure_url || data.url, 
        mimeType: data.resource_type || null,
        public_id: data.public_id || null,
        format: data.format || null,
        bytes: data.bytes || null
      };
    } catch (uploadError) {
      console.error("Upload error:", uploadError);
      if (uploadError instanceof Error) {
        return { error: uploadError.message, url: "" };
      }
      if (typeof uploadError === "string") {
        return { error: uploadError, url: "" };
      }
      return { error: "Upload failed", url: "" };
    } finally {
      setLoading(false);
    }
  }, []);

  return [upload, { loading }] as const;
}

export { useUpload };
export default useUpload;
