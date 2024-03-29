require("dotenv").config();
const some = require("lodash/some");

const FiatTokenV2 = artifacts.require("FiatTokenV2");
const FiatTokenProxy = artifacts.require("FiatTokenProxy");
const FiatTokenUtil = artifacts.require("FiatTokenUtil");
const SignatureChecker = artifacts.require("SignatureChecker");

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

  console.log("Deploying and linking SignatureChecker library contract...");
  await deployer.deploy(SignatureChecker);
  await deployer.link(SignatureChecker, FiatTokenV2);

  console.log("Deploying FiatTokenV2 implementation contract...");
  await deployer.deploy(FiatTokenV2);

  const fiatTokenV2 = await FiatTokenV2.deployed();
  console.log("Deployed FiatTokenV2 at", fiatTokenV2.address);
  console.log(
    "Initializing FiatTokenV2 implementation contract with dummy values..."
  );
  await fiatTokenV2.initialize(
    "",
    "",
    "",
    0,
    THROWAWAY_ADDRESS,
    THROWAWAY_ADDRESS,
    THROWAWAY_ADDRESS,
    THROWAWAY_ADDRESS
  );
  await fiatTokenV2.initializeV2("");

  console.log("Deploying FiatTokenUtil contract...");
  const fiatTokenUtil = await deployer.deploy(
    FiatTokenUtil,
    proxyContractAddress
  );
  console.log("Deployed FiatTokenUtil at", fiatTokenUtil.address);
};
