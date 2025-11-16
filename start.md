$ unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY no_proxy NO_PROXY && NIXPKGS_ALLOW_UNFREE=1 ~/nixstatic shell --impure nixpkgs/25.05#nodejs nixpkgs/25.05#pnpm -c bash
