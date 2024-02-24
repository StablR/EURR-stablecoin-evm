require("dotenv").config();
const some = require("lodash/some");

const FiatTokenV2 = artifacts.require("FiatTokenV2");
const FiatTokenV3 = artifacts.require("FiatTokenV3");
const FiatTokenProxy = artifacts.require("FiatTokenProxy");
const V3Upgrader = artifacts.require("V3Upgrader");
const proxyArtifact = require("../build/contracts/FiatTokenProxy.json");

const {
  PROXY_ADMIN_ADDRESS = "",
  PROXY_CONTRACT_ADDRESS = "",
  MASTERMINTER_ADDRESS = "",
} = process.env;

let proxyAdminAddress = PROXY_ADMIN_ADDRESS;
let proxyContractAddress = PROXY_CONTRACT_ADDRESS;
let masterMinterAddress = MASTERMINTER_ADDRESS;

module.exports = async (deployer, network) => {
  if (some(["development", "coverage"], (v) => network.includes(v))) {
    // DO NOT USE THIS ADDRESS IN PRODUCTION
    proxyAdminAddress = "0x69D7b24ADC049Fc1337F1F6F5593D19d8D605B04";
    proxyContractAddress = "0xdaC306D72f48dbaD805a11CBf7A512A277C084C9";
    masterMinterAddress = "0x5E9eB5b3639dB72766F13323d6bCA3f9E9747f74";
  }

  proxyContractAddress =
    proxyContractAddress || (await FiatTokenProxy.deployed()).address;

  if (!proxyAdminAddress || !proxyContractAddress || !masterMinterAddress) {
    throw new Error(
      "PROXY_ADMIN_ADDRESS, PROXY_CONTRACT_ADDRESS and MASTERMINTER_ADDRESS must be provided in config.js"
    );
  }

  const fiatTokenV3 = await FiatTokenV3.deployed();

  console.log(`Proxy Admin:     ${proxyAdminAddress}`);
  console.log(`FiatTokenProxy:  ${proxyContractAddress}`);
  console.log(`Master Minter:   ${masterMinterAddress}`);
  console.log(`FiatTokenV3:     ${fiatTokenV3.address}`);

  console.log("Deploying V3Upgrader contract...");

  const v3Upgrader = await deployer.deploy(
    V3Upgrader,
    proxyContractAddress,
    fiatTokenV3.address,
    proxyAdminAddress
  );

  console.log(`>>>>>>> Deployed V3Upgrader at ${v3Upgrader.address} <<<<<<<`);

  console.log("Loading proxy contract...");
  const proxyInstance = new web3.eth.Contract(
    proxyArtifact.abi,
    proxyContractAddress
  );
  console.log("Proxy contract loaded correctly: ", proxyInstance.address);

  console.log("Transfer PROXY_ADMIN role to V3Upgrader contract...");
  let currentTx = await proxyInstance.changeAdmin(v3Upgrader.address, {
    from: proxyAdminAddress,
  });
  console.log(
    "Transfer PROXY_ADMIN role to V3Upgrader contract has been done correctly: ",
    currentTx
  );

  console.log("Loading proxied contract...");
  const proxiedInstance = new web3.eth.Contract(
    FiatTokenV2.abi,
    proxyContractAddress
  );
  console.log("Proxied contract loaded correctly: ", proxiedInstance.address);

  console.log("Mint 0.2 EURR to the V3Upgrader contract...");

  const amount = web3.util.toWei("0.2");
  currentTx = await proxiedInstance.mint(v3Upgrader.address, amount, {
    from: masterMinterAddress,
  });

  console.log(
    "Mint 0.2 EURR to the V3Upgrader contract has been done correctly: ",
    currentTx
  );

  console.log("Upgrader upgrade process starting...");
  currentTx = v3Upgrader.upgrade();
  console.log("Upgrader upgrade process has been done correctly: ", currentTx);
};
