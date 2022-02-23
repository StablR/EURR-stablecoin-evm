# StablR Token

This repository is based on the [CENTRE](https://centre.io) Token repository taken from the following [commit](https://github.com/centrehq/centre-tokens/commit/0d3cab14ebd133a83fc834dbd48d0468bdf0b391).

## Setup

Requirements:

- Node >= v12
- Yarn

```
$ git clone git@github.com:qredo/stablr-token.git
$ cd stablr-token
$ npm i -g yarn       # Install yarn if you don't already have it
$ yarn install        # Install dependencies
$ yarn setup          # Setup Git hooks
```

## TypeScript type definition files for the contracts

Install NPM dependencies and generate type definitions:

```
$ npm install
$ yarn compile && yarn typechain
```

## Linting and Formatting

To check code for problems:

```
$ yarn typecheck      # Type-check TypeScript code
$ yarn lint           # Check JavaScript and TypeScript code
$ yarn lint --fix     # Fix problems where possible
$ yarn solhint        # Check Solidity code
$ yarn slither        # Run Slither
```

To auto-format code:

```
$ yarn fmt
```

## Testing

First, make sure Ganache is running.

```
$ yarn ganache
```

Run all tests:

```
$ yarn test
```

To run tests in a specific file, run:

```
$ yarn test [path/to/file]
```

To run tests and generate test coverage, run:

```
$ yarn coverage
```

## Deployment

Populate (create if missing) the `config.js` configuration file. Enter
the BIP39 mnemonic phrase, the INFURA API key to use for deployment, and the
addresses of proxy admin, owner, master minter, blacklister, and pauser in
`config.js`. This file must not be checked into the repository. To prevent
accidental check-ins, `config.js` is in `.gitignore`.

Run `yarn migrate --network NETWORK`, where NETWORK is either `mainnet` or
`ropsten`.

## Verifcation

### Example 1
```truffle run verify FiatTokenV2 FiatTokenProxy --network ropsten```

https://ropsten.etherscan.io/proxyContractChecker?a=YOURCONTRACTADDRESS

### Example 2
```truffle run verify FiatTokenV2@YOURCONTRACTADDRESS --network ropsten```

```truffle run verify FiatTokenProxy@YOURCONTRACTADDRESS --network ropsten```

https://ropsten.etherscan.io/proxyContractChecker?a=YOURCONTRACTADDRESS

## Contracts

The implementation uses 2 separate contracts - a proxy contract
(`FiatTokenProxy.sol`) and an implementation contract (`FiatToken.sol`). This
allows upgrading the contract, as a new implementation contact can be deployed
and the Proxy updated to point to it.

### FiatToken

The FiatToken offers a number of capabilities, which briefly are described
below. There are more [detailed design docs](./doc/tokendesign.md) in the `doc`
folder.

### ERC20 compatible

The FiatToken implements the ERC20 interface.

### Pausable

The entire contract can be frozen, in case a serious bug is found or there is a
serious key compromise. No transfers can take place while the contract is
paused. Access to the pause functionality is controlled by the `pauser` address.

### Upgradable

A new implementation contract can be deployed, and the proxy contract will
forward calls to the new contract. Access to the upgrade functionality is
guarded by a `proxyOwner` address. Only the `proxyOwner` address can change the
`proxyOwner` address.

### Blacklist

The contract can blacklist certain addresses which will prevent those addresses
from transferring or receiving tokens. Access to the blacklist functionality is
controlled by the `blacklister` address.

### Minting/Burning

Tokens can be minted or burned on demand. The contract supports having multiple
minters simultaneously. There is a `masterMinter` address which controls the
list of minters and how much each is allowed to mint. The mint allowance is
similar to the ERC20 allowance - as each minter mints new tokens their allowance
decreases. When it gets too low they will need the allowance increased again by
the `masterMinter`.

### Ownable

The contract has an Owner, who can change the `owner`, `pauser`, `blacklister`,
or `masterMinter` addresses. The `owner` can not change the `proxyOwner`
address.