// chain configs in ocean.js ConfigHelperConfig format
// see: https://github.com/oceanprotocol/ocean.js/blob/e07a7cb6ecea12b39ed96f994b4abe37806799a1/src/utils/ConfigHelper.ts#L8
// networkId is required, since its used to look for overwrites
// all other fields are first loaded from ocean.js and are optional
const GX_NETWORK_ID = 2021000

const chains = [
  {
    name: 'Gaia-X',
    networkId: GX_NETWORK_ID,
    nodeUri: 'https://rpc.gaiaxtestnet.oceanprotocol.com/',
    providerUri: 'https://provider.gaiax.delta-dao.com/',
    explorerUri: 'https://blockscout.gaiaxtestnet.oceanprotocol.com/',
    isDefault: true
  },
  {
    name: 'EVMOS',
    network: 'testnet',
    networkId: 9000,
    nodeUri: 'https://eth.bd.evmos.dev:8545/',
    providerUri: 'https://provider.evmos.delta-dao.com/',
    metadataCacheUri: 'https://aquarius.delta-dao.com/',
    explorerUri: undefined,
    isDefault: true,
    factoryAddress: '0x5034F49b27353CeDc562b49eA91C7438Ea351d36',
    fixedRateExchangeAddress: '0x3f6c622D32dA3BC70730C9E677ec343cb5acFe68',
    metadataContractAddress: '0x51FC52Fd0B30fA0319D97893dEFE0201fEd39C4c'

    //oceanTokenAddress?: string;
    //dispenserAddress?: string;
    //"BFactory": "0xe4e47451AAd6C89a6D9E4aD104A7b77FfE1D3b36"
  }
]

const getDefaultChainIds = () => {
  return chains.filter((chain) => chain.isDefault).map((c) => c.networkId)
}

const getSupportedChainIds = () => {
  return chains.map((c) => c.networkId)
}

module.exports = {
  chains,
  getDefaultChainIds,
  getSupportedChainIds,
  GX_NETWORK_ID
}
