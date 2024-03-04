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

    function getChainId() external virtual pure returns (uint256 chainId) {
        assembly {
            chainId := chainid()
        }
        return chainId;
    }
}
