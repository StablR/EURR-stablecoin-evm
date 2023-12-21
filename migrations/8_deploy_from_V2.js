require("dotenv").config();
const some = require("lodash/some");

const FiatTokenV2 = artifacts.require("FiatTokenV2");
const FiatTokenProxy = artifacts.require("FiatTokenProxy");

const THROWAWAY_ADDRESS = "0x0000000000000000000000000000000000000001";

const {
  PROXY_ADMIN_ADDRESS = "",
  OWNER_ADDRESS = "",
  MASTERMINTER_ADDRESS = "",
  PAUSER_ADDRESS = "",
  BLACKLISTER_ADDRESS = "",
  APPEND_NAME = "",
  APPEND_TICKER = "",
} = process.env;

let proxyAdminAddress = PROXY_ADMIN_ADDRESS;
let ownerAddress = OWNER_ADDRESS;
let masterMinterAddress = MASTERMINTER_ADDRESS;
let pauserAddress = PAUSER_ADDRESS;
let blacklisterAddress = BLACKLISTER_ADDRESS;

// Optionally append name and ticker (for testnets only)
const appendName = APPEND_NAME;
const appendTicker = APPEND_TICKER;

// Apply custom name to the token name and ticker if available
const tokenName =
  appendName === "" ? "StablR EUR" : `StablR EUR (${appendName})`;
const tickerName = appendTicker === "" ? "EURR" : `EURR-${appendTicker}`;

module.exports = async (deployer, network) => {
  if (some(["ropsten", "mainnet", "sepolia"], (v) => network.includes(v))) {
    if (some(["development", "coverage"], (v) => network.includes(v))) {
      // DO NOT USE THESE ADDRESSES IN PRODUCTION - these are the deterministic
      // addresses from ganache, so the private keys are well known and match the
      // values we use in the tests
      proxyAdminAddress = "0x2F560290FEF1B3Ada194b6aA9c40aa71f8e95598";
      ownerAddress = "0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d";
      masterMinterAddress = "0x3E5e9111Ae8eB78Fe1CC3bb8915d5D461F3Ef9A9";
      pauserAddress = "0xACa94ef8bD5ffEE41947b4585a84BdA5a3d3DA6E";
      blacklisterAddress = "0xd03ea8624C8C5987235048901fB614fDcA89b117";
    }

    console.log(`Proxy Admin:   ${proxyAdminAddress}`);
    console.log(`Owner:         ${ownerAddress}`);
    console.log(`Master Minter: ${masterMinterAddress}`);
    console.log(`Pauser:        ${pauserAddress}`);
    console.log(`Blacklister:   ${blacklisterAddress}`);

    if (
      !proxyAdminAddress ||
      !ownerAddress ||
      !masterMinterAddress ||
      !pauserAddress ||
      !blacklisterAddress
    ) {
      throw new Error(
        "PROXY_ADMIN_ADDRESS, OWNER_ADDRESS, MASTERMINTER_ADDRESS, PAUSER_ADDRESS, and BLACKLISTER_ADDRESS must be provided in the env variables"
      );
    }

    console.log("Deploying implementation contract...");
    await deployer.deploy(FiatTokenV2);
    const fiatTokenV2 = await FiatTokenV2.deployed();
    console.log("Deployed implementation contract at", FiatTokenV2.address);

    console.log("Initializing implementation contract with dummy values...");
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

    console.log("Deploying proxy contract...");
    await deployer.deploy(FiatTokenProxy, FiatTokenV2.address);
    const fiatTokenProxy = await FiatTokenProxy.deployed();
    console.log("Deployed proxy contract at", FiatTokenProxy.address);

    console.log("Reassigning proxy contract admin...");
    // need to change admin first, or the call to initialize won't work
    // since admin can only call methods in the proxy, and not forwarded methods
    await fiatTokenProxy.changeAdmin(proxyAdminAddress);

    console.log("Initializing proxy contract...");
    // Pretend that the proxy address is a FiatTokenV2 - this is fine because the
    // proxy will forward all the calls to the FiatTokenV2 impl
    const proxyAsV2 = await FiatTokenV2.at(FiatTokenProxy.address);

    await proxyAsV2.initialize(
      tokenName,
      tickerName,
      "EUR",
      6,
      masterMinterAddress,
      pauserAddress,
      blacklisterAddress,
      ownerAddress
    );
    await proxyAsV2.initializeV2(tickerName);
  }
};
