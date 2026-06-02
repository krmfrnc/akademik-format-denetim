#!/bin/bash
mkdir -p /var/www/storage
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node --version