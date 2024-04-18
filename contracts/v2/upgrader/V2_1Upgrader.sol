/**
 * SPDX-License-Identifier: MIT
 *
 * Copyright (c) 2018-2020 CENTRE SECZ
 * Copyright (c) 2022 Qredo Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

pragma solidity 0.6.12;

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { AbstractV2Upgrader } from "./AbstractV2Upgrader.sol";
import { FiatTokenV2_1 } from "../FiatTokenV2_1.sol";
import { FiatTokenProxy } from "../../v1/FiatTokenProxy.sol";
import { V2_1UpgraderHelper } from "./helpers/V2_1UpgraderHelper.sol";

/**
 * @title V2.1 Upgrader
 * @dev Read docs/v2.1_upgrade.md
 */
contract V2_1Upgrader is AbstractV2Upgrader {
    using SafeMath for uint256;

    struct FiatTokenMetadata {
        string name;
        uint8 decimals;
        string currency;
        string version;
        bytes32 domainSeparator;
        address masterMinter;
        address owner;
        address pauser;
        address blacklister;
        bool paused;
        uint256 totalSupply;
    }

    /**
     * @notice Constructor
     * @param proxyAddr          FiatTokenProxy contract
     * @param implementationAddr FiatTokenV2_1 implementation contract
     * @param newProxyAdminAddr  Grantee of proxy admin role after upgrade
     */
    constructor(
        FiatTokenProxy proxyAddr,
        FiatTokenV2_1 implementationAddr,
        address newProxyAdminAddr
    )
        public
        AbstractV2Upgrader(
            proxyAddr,
            address(implementationAddr),
            newProxyAdminAddr
        )
    {
        _helper = new V2_1UpgraderHelper(address(proxyAddr));
    }

    /**
     * @notice Upgrade, transfer proxy admin role to a given address, run a
     * sanity test, and tear down the upgrader contract, in a single atomic
     * transaction. It rolls back if there is an error.
     */
    function upgrade() external onlyOwner {
        // The helper needs to be used to read contract state because
        // AdminUpgradeabilityProxy does not allow the proxy admin to make
        // proxy calls.
        V2_1UpgraderHelper v21Helper = V2_1UpgraderHelper(address(_helper));

        // Check that this contract sufficient funds to run the tests
        uint256 contractBal = v21Helper.balanceOf(address(this));
        require(contractBal >= 2e5, "V2_2Upgrader: 0.2 FiatToken needed");

        uint256 callerBal = v21Helper.balanceOf(msg.sender);

        // Keep original contract metadata
        FiatTokenMetadata memory originalMetadata = FiatTokenMetadata(
            v21Helper.name(),
            v21Helper.decimals(),
            v21Helper.currency(),
            v21Helper.version(),
            v21Helper.DOMAIN_SEPARATOR(),
            v21Helper.masterMinter(),
            v21Helper.fiatTokenOwner(),
            v21Helper.pauser(),
            v21Helper.blacklister(),
            v21Helper.paused(),
            v21Helper.totalSupply()
        );

        // Change implementation contract address
        _proxy.upgradeTo(_implementation);

        // Transfer proxy admin role
        _proxy.changeAdmin(_newProxyAdmin);

        // Initialize V2 contract
        FiatTokenV2_1 v2_1 = FiatTokenV2_1(address(_proxy));
        v2_1.initializeV2_1();

        // Sanity test
        // Check metadata
        FiatTokenMetadata memory upgradedMetadata = FiatTokenMetadata(
            v2_1.name(),
            v2_1.decimals(),
            v2_1.currency(),
            v2_1.version(),
            v2_1.DOMAIN_SEPARATOR(),
            v2_1.masterMinter(),
            v2_1.owner(),
            v2_1.pauser(),
            v2_1.blacklister(),
            v2_1.paused(),
            v2_1.totalSupply()
        );

        require(
            checkFiatTokenMetadataEqual(originalMetadata, upgradedMetadata),
            "V2_1Upgrader: metadata test failed"
        );

        // Test transfer
        // Test balanceOf
        require(
            v2_1.balanceOf(address(this)) == contractBal,
            "V2_1Upgrader: balanceOf test failed"
        );

        // Test transfer
        require(
            v2_1.transfer(msg.sender, 1e5) &&
                v2_1.balanceOf(msg.sender) == callerBal.add(1e5) &&
                v2_1.balanceOf(address(this)) == contractBal.sub(1e5),
            "V2_1Upgrader: transfer test failed"
        );

        // Test approve/transferFrom
        require(
            v2_1.approve(address(v21Helper), 1e5) &&
                v2_1.allowance(address(this), address(v21Helper)) == 1e5 &&
                v21Helper.transferFrom(address(this), msg.sender, 1e5) &&
                v2_1.allowance(address(this), msg.sender) == 0 &&
                v2_1.balanceOf(msg.sender) == callerBal.add(2e5) &&
                v2_1.balanceOf(address(this)) == contractBal.sub(2e5),
            "V2_1Upgrader: approve/transferFrom test failed"
        );

        // Test increase/decrease allowance
        require(
            v2_1.increaseAllowance(address(v21Helper), 1e5) &&
                v2_1.allowance(address(this), address(v21Helper)) == 1e5 &&
                v21Helper.decreaseAllowance(address(v21Helper), 1e5) &&
                v2_1.allowance(address(this), msg.sender) == 0,
            "V2_1Upgrader: increase/decrease allowance test failed"
        );

        // Transfer any remaining FiatToken to the caller
        withdrawFiatToken();

        // Tear down
        tearDown();
    }

    /**
     * @dev Checks whether two FiatTokenMetadata are equal.
     * @return true if the two metadata are equal, false otherwise.
     */
    function checkFiatTokenMetadataEqual(
        FiatTokenMetadata memory a,
        FiatTokenMetadata memory b
    ) private pure returns (bool) {
        return
            keccak256(bytes(a.name)) == keccak256(bytes(b.name)) &&
            a.decimals == b.decimals &&
            keccak256(bytes(a.currency)) == keccak256(bytes(b.currency)) &&
            keccak256(bytes(a.version)) == keccak256(bytes(b.version)) &&
            a.domainSeparator == b.domainSeparator &&
            a.masterMinter == b.masterMinter &&
            a.owner == b.owner &&
            a.pauser == b.pauser &&
            a.blacklister == b.blacklister &&
            a.paused == b.paused &&
            a.totalSupply == b.totalSupply;
    }
}
