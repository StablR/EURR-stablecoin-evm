require("dotenv").config();

const V2_1Upgrader = artifacts.require("V2_1Upgrader");

const {
  PROXY_ADMIN_ADDRESS = "",
  PROXY_CONTRACT_ADDRESS = "",
  FIATOKEN21_CONTRACT_ADDRESS = "",
} = process.env;

const proxyAdminAddress = PROXY_ADMIN_ADDRESS;
const proxyContractAddress = PROXY_CONTRACT_ADDRESS;
const fiatTokenV2_1 = FIATOKEN21_CONTRACT_ADDRESS;
module.exports = async (deployer) => {
  console.log(`Proxy Admin:     ${proxyAdminAddress}`);
  console.log(`FiatTokenProxy:  ${proxyContractAddress}`);
  console.log(`FiatTokenV2_1:   ${fiatTokenV2_1}`);

  if (!proxyAdminAddress) {
    throw new Error("PROXY_ADMIN_ADDRESS must be provided in config.js");
  }

  console.log("Deploying V2_1Upgrader contract...");

  const v2_1Upgrader = await deployer.deploy(
    V2_1Upgrader,
    proxyContractAddress,
    fiatTokenV2_1,
    proxyAdminAddress
  );

  console.log(`>>>>>>> Deployed V2_1Upgrader at ${v2_1Upgrader} <<<<<<<`);
};
