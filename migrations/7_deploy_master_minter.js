require("dotenv").config();
const MasterMinter = artifacts.require("MasterMinter.sol");
const FiatTokenProxy = artifacts.require("FiatTokenProxy.sol");

const { MASTERMINTER_ADDRESS = "", PROXY_CONTRACT_ADDRESS = "" } = process.env;

let masterMinterAddress = MASTERMINTER_ADDRESS;
let fiatTokenAddress = PROXY_CONTRACT_ADDRESS;

module.exports = function (deployer, network) {
  if (network === "development" || network === "coverage") {
    // Change these if deploying for real, these are deterministic
    // address from ganache
    masterMinterAddress = "0x3e5e9111ae8eb78fe1cc3bb8915d5d461f3ef9a9";
    fiatTokenAddress = FiatTokenProxy.address;
  }
  console.log("deploying MasterMinter for fiat token at " + fiatTokenAddress);
  deployer
    .deploy(MasterMinter, fiatTokenAddress)
    .then(function (mm) {
      console.log("master minter deployed at " + mm.address);
      console.log("reassigning owner to " + masterMinterAddress);
      return mm.transferOwnership(masterMinterAddress);
    })
    .then(function () {
      console.log("All done.");
    });
};
