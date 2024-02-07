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
import { Ownable } from "../../v1/Ownable.sol";
import { FiatTokenV3 } from "../FiatTokenV3.sol";
import { FiatTokenProxy } from "../../v1/FiatTokenProxy.sol";
import { V3UpgraderHelper } from "./V3UpgraderHelper.sol";

/**
 * @title V3 Upgrader
 * @notice Performs EURR v3 upgrade, and runs a basic sanity test in a single
 * atomic transaction, rolling back if any issues are found. This may be
 * overkill, but the peace of mind is worth the gas spent. By performing the
 * upgrade atomically, it ensures that there is no disruption of service if the
 * upgrade is not successful for some unforeseen circumstances.
 * @dev Read docs/v3_upgrade.md
 */
contract V3Upgrader is Ownable {
    using SafeMath for uint256;

    FiatTokenProxy private _proxy;
    FiatTokenV3 private _implementation;
    address private _newProxyAdmin;
    string private _newName;
    V3UpgraderHelper private _helper;

    /**
     * @notice Constructor
     * @param proxy             FiatTokenProxy contract
     * @param implementation    FiatTokenV3 implementation contract
     * @param newProxyAdmin     Grantee of proxy admin role after upgrade
     * @param newName           New ERC20 name (e.g. "EUR//R" -> "EUR Coin")
     */
    constructor(
        FiatTokenProxy proxy,
        FiatTokenV3 implementation,
        address newProxyAdmin,
        string memory newName
    ) public Ownable() {
        _proxy = proxy;
        _implementation = implementation;
        _newProxyAdmin = newProxyAdmin;
        _newName = newName;
        _helper = new V3UpgraderHelper(address(proxy));
    }

    /**
     * @notice The address of the FiatTokenProxy contract
     * @return Contract address
     */
    function proxy() external view returns (address) {
        return address(_proxy);
    }

    /**
     * @notice The address of the FiatTokenV3 implementation contract
     * @return Contract address
     */
    function implementation() external view returns (address) {
        return address(_implementation);
    }

    /**
     * @notice The address of the V2UpgraderHelper contract
     * @return Contract address
     */
    function helper() external view returns (address) {
        return address(_helper);
    }

    /**
     * @notice The address to which the proxy admin role will be transferred
     * after the upgrade is completed
     * @return Address
     */
    function newProxyAdmin() external view returns (address) {
        return _newProxyAdmin;
    }

    /**
     * @notice New ERC20 token name
     * @return New Name
     */
    function newName() external view returns (string memory) {
        return _newName;
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

        // Check that this contract sufficient funds to run the tests
        uint256 contractBal = _helper.balanceOf(address(this));
        require(contractBal >= 2e5, "V3Upgrader: 0.2 EURR needed");

        uint256 callerBal = _helper.balanceOf(msg.sender);

        // Keep original contract metadata
        string memory symbol = _helper.symbol();
        uint8 decimals = _helper.decimals();
        string memory currency = _helper.currency();
        address masterMinter = _helper.masterMinter();
        address owner = _helper.fiatTokenOwner();
        address pauser = _helper.pauser();
        address blacklister = _helper.blacklister();

        // Change implementation contract address
        _proxy.upgradeTo(address(_implementation));

        // Transfer proxy admin role
        _proxy.changeAdmin(_newProxyAdmin);

        // Initialize V3 contract
        FiatTokenV3 v3 = FiatTokenV3(address(_proxy));
        v3.initializeV3();

        // Sanity test
        // Check metadata
        require(
            keccak256(bytes(_newName)) == keccak256(bytes(v3.name())) &&
                keccak256(bytes(symbol)) == keccak256(bytes(v3.symbol())) &&
                decimals == v3.decimals() &&
                keccak256(bytes(currency)) == keccak256(bytes(v3.currency())) &&
                masterMinter == v3.masterMinter() &&
                owner == v3.owner() &&
                pauser == v3.pauser() &&
                blacklister == v3.blacklister(),
            "V3Upgrader: metadata test failed"
        );

        // Test balanceOf
        require(
            v3.balanceOf(address(this)) == contractBal,
            "V3Upgrader: balanceOf test failed"
        );

        // Test transfer
        require(
            v3.transfer(msg.sender, 1e5) &&
                v3.balanceOf(msg.sender) == callerBal.add(1e5) &&
                v3.balanceOf(address(this)) == contractBal.sub(1e5),
            "V3Upgrader: transfer test failed"
        );

        // Test approve/transferFrom
        require(
            v3.approve(address(_helper), 1e5) &&
                v3.allowance(address(this), address(_helper)) == 1e5 &&
                _helper.transferFrom(address(this), msg.sender, 1e5) &&
                v3.allowance(address(this), msg.sender) == 0 &&
                v3.balanceOf(msg.sender) == callerBal.add(2e5) &&
                v3.balanceOf(address(this)) == contractBal.sub(2e5),
            "V3Upgrader: approve/transferFrom test failed"
        );

        // Transfer any remaining ERUR to the caller
        withdrawEURR();

        // Tear down
        _helper.tearDown();
        selfdestruct(msg.sender);
    }

    /**
     * @notice Withdraw any EURR in the contract
     */
    function withdrawEURR() public onlyOwner {
        IERC20 eurr = IERC20(address(_proxy));
        uint256 balance = eurr.balanceOf(address(this));
        if (balance > 0) {
            require(
                eurr.transfer(msg.sender, balance),
                "V3Upgrader: failed to withdraw EURR"
            );
        }
    }

    /**
     * @notice Transfer proxy admin role to newProxyAdmin, and self-destruct
     */
    function abortUpgrade() external onlyOwner {
        // Transfer proxy admin role
        _proxy.changeAdmin(_newProxyAdmin);

        // Tear down
        _helper.tearDown();
        selfdestruct(msg.sender);
    }
}
