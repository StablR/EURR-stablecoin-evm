require("dotenv").config();
const some = require("lodash/some");

const FiatTokenV3 = artifacts.require("FiatTokenV3");
const FiatTokenProxy = artifacts.require("FiatTokenProxy");

const THROWAWAY_ADDRESS = "0x0000000000000000000000000000000000000001";

const { PROXY_CONTRACT_ADDRESS = "" } = process.env;

let proxyContractAddress = PROXY_CONTRACT_ADDRESS;

module.exports = async (deployer, network) => {
  if (
    !proxyContractAddress ||
    some(["development", "coverage"], (v) => network.includes(v))
  ) {
    proxyContractAddress = (await FiatTokenProxy.deployed()).address;
  }

  console.log(`FiatTokenProxy: ${proxyContractAddress}`);

  console.log("Deploying FiatTokenV3 implementation contract...");
  await deployer.deploy(FiatTokenV3);

  const fiatTokenV3 = await FiatTokenV3.deployed();
  console.log("Deployed FiatTokenV3 at", fiatTokenV3.address);
  console.log(
    "Initializing FiatTokenV3 implementation contract with dummy values..."
  );
  await fiatTokenV3.initialize(
    "",
    "",
    "",
    0,
    THROWAWAY_ADDRESS,
    THROWAWAY_ADDRESS,
    THROWAWAY_ADDRESS,
    THROWAWAY_ADDRESS
  );

  await fiatTokenV3.initializeV2("");

  await fiatTokenV3.initializeV3();
};
