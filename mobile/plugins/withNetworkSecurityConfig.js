const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withNetworkSecurityConfig = (config) => {
  // Step 1: Add networkSecurityConfig attribute to AndroidManifest.xml
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    if (manifest.$) {
      manifest.$['android:networkSecurityConfig'] = '@xml/network_security_config';
      manifest.$['android:usesCleartextTraffic'] = 'true';
    }
    return config;
  });

  // Step 2: Create the network_security_config.xml file
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const xmlDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml'
      );

      if (!fs.existsSync(xmlDir)) {
        fs.mkdirSync(xmlDir, { recursive: true });
      }

      const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">72.60.190.38</domain>
    </domain-config>
</network-security-config>`;

      fs.writeFileSync(
        path.join(xmlDir, 'network_security_config.xml'),
        xmlContent
      );

      return config;
    },
  ]);

  return config;
};

module.exports = withNetworkSecurityConfig;
