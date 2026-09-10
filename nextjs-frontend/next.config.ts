import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Emit a self-contained server bundle so the Docker runtime stage needs
    // neither the source tree nor a full node_modules install.
    output: "standalone",
};

export default nextConfig;
