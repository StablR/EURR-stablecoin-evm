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

import { FiatTokenV2 } from "./FiatTokenV2.sol";
import { EIP712Domain } from "./EIP712Domain.sol"; // solhint-disable-line no-unused-import
import { EIP712 } from "../util/EIP712.sol";

// solhint-disable func-name-mixedcase

/**
 * @title FiatToken V2.1
 * @notice ERC20 Token backed by fiat reserves, version 2.1
 */
contract FiatTokenV2_1 is FiatTokenV2 {
    event IncreaseAllowance(
        address indexed owner,
        address indexed spender,
        uint256 incrementedValue
    );
    event DecreaseAllowance(
        address indexed owner,
        address indexed spender,
        uint256 decrementedValue
    );

    event IncreaseMinterAllowance(address indexed minter, uint256 increment);
    event DecreaseMinterAllowance(address indexed minter, uint256 decrement);

    /**
     * @notice Initialize v2.1
     */
    function initializeV2_1() external {
        // solhint-disable-next-line reason-string
        require(_initializedVersion == 1);

        _initializedVersion = 2;
    }

    /**
     * @notice Version string for the EIP712 domain separator
     * @return Version string
     */
    function version() external pure returns (string memory) {
        return "2";
    }

    /**
     * @notice Increase the allowance by a given increment
     * @param spender   Spender's address
     * @param increment Amount of increase in allowance
     * @return True if successful
     */
    function increaseAllowance(address spender, uint256 increment)
        external
        override
        whenNotPaused
        notBlacklisted(msg.sender)
        notBlacklisted(spender)
        returns (bool)
    {
        super._increaseAllowance(msg.sender, spender, increment);
        emit IncreaseAllowance(msg.sender, spender, increment);
        return true;
    }

    /**
     * @notice Decrease the allowance by a given decrement
     * @param spender   Spender's address
     * @param decrement Amount of decrease in allowance
     * @return True if successful
     */
    function decreaseAllowance(address spender, uint256 decrement)
        external
        override
        whenNotPaused
        notBlacklisted(msg.sender)
        notBlacklisted(spender)
        returns (bool)
    {
        super._decreaseAllowance(msg.sender, spender, decrement);
        emit DecreaseAllowance(msg.sender, spender, decrement);
        return true;
    }

    /**
     * @notice Increase the Minter's allowance by a given increment
     * @param minter    Minter's address
     * @param increment Amount of increase in allowance
     * @return True if successful
     */
    function increaseMinterAllowance(address minter, uint256 increment)
        external
        virtual
        whenNotPaused
        onlyMasterMinter
        notBlacklisted(msg.sender)
        notBlacklisted(minter)
        returns (bool)
    {
        require(minters[minter], "address not a minter");

        minterAllowed[minter] = minterAllowed[minter].add(increment);

        emit IncreaseMinterAllowance(minter, increment);

        return true;
    }

    /**
     * @notice Decrease the Minter's allowance by a given increment
     * @param minter    Minter's address
     * @param decrement Amount of decrease in allowance
     * @return True if successful
     */
    function decreaseMinterAllowance(address minter, uint256 decrement)
        external
        virtual
        whenNotPaused
        onlyMasterMinter
        notBlacklisted(msg.sender)
        notBlacklisted(minter)
        returns (bool)
    {
        require(minters[minter], "address not a minter");

        minterAllowed[minter] = minterAllowed[minter].sub(
            decrement,
            "decreased minter allowance below zero"
        );

        emit DecreaseMinterAllowance(minter, decrement);

        return true;
    }

    function getChainId() external virtual pure returns (uint256 chainId) {
        return _chainId();
    }

    function _chainId() internal virtual pure returns (uint256) {
        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        return chainId;
    }

    /**
     * @notice Update allowance with a signed permit
     * @dev EOA wallet signatures should be packed in the order of r, s, v.
     * @param owner       Token owner's address (Authorizer)
     * @param spender     Spender's address
     * @param value       Amount of allowance
     * @param deadline    The time at which the signature expires (unix time), or max uint256 value to signal no expiration
     * @param signature   Signature bytes signed by an EOA wallet or a contract wallet
     */
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        bytes memory signature
    ) external whenNotPaused notBlacklisted(owner) notBlacklisted(spender) {
        _permit(owner, spender, value, deadline, signature);
    }

    /**
     * @notice Execute a transfer with a signed authorization
     * @dev EOA wallet signatures should be packed in the order of r, s, v.
     * @param from          Payer's address (Authorizer)
     * @param to            Payee's address
     * @param value         Amount to be transferred
     * @param validAfter    The time after which this is valid (unix time)
     * @param validBefore   The time before which this is valid (unix time)
     * @param nonce         Unique nonce
     * @param signature     Signature bytes signed by an EOA wallet or a contract wallet
     */
    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        bytes memory signature
    ) external whenNotPaused notBlacklisted(from) notBlacklisted(to) {
        _transferWithAuthorization(
            from,
            to,
            value,
            validAfter,
            validBefore,
            nonce,
            signature
        );
    }

    /**
     * @notice Receive a transfer with a signed authorization from the payer
     * @dev This has an additional check to ensure that the payee's address
     * matches the caller of this function to prevent front-running attacks.
     * EOA wallet signatures should be packed in the order of r, s, v.
     * @param from          Payer's address (Authorizer)
     * @param to            Payee's address
     * @param value         Amount to be transferred
     * @param validAfter    The time after which this is valid (unix time)
     * @param validBefore   The time before which this is valid (unix time)
     * @param nonce         Unique nonce
     * @param signature     Signature bytes signed by an EOA wallet or a contract wallet
     */
    function receiveWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        bytes memory signature
    ) external whenNotPaused notBlacklisted(from) notBlacklisted(to) {
        _receiveWithAuthorization(
            from,
            to,
            value,
            validAfter,
            validBefore,
            nonce,
            signature
        );
    }

    /**
     * @notice Attempt to cancel an authorization
     * @dev Works only if the authorization is not yet used.
     * EOA wallet signatures should be packed in the order of r, s, v.
     * @param authorizer    Authorizer's address
     * @param nonce         Nonce of the authorization
     * @param signature     Signature bytes signed by an EOA wallet or a contract wallet
     */
    function cancelAuthorization(
        address authorizer,
        bytes32 nonce,
        bytes memory signature
    ) external whenNotPaused {
        _cancelAuthorization(authorizer, nonce, signature);
    }

    /**
     * @inheritdoc EIP712Domain
     */
    function _domainSeparator() internal override view returns (bytes32) {
        return EIP712.makeDomainSeparator(name, "2", _chainId());
    }
}
