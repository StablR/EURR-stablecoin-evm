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

import { FiatTokenV2_1 } from "./FiatTokenV2_1.sol";
import { ProofOfReserveFeed } from "./ProofOfReserveFeed.sol";
import { AggregatorV3Interface } from "./AggregatorV3Interface.sol";

// solhint-disable func-name-mixedcase

/**
 * @title FiatToken V2.2
 * @notice ERC20 Token backed by fiat reserves, version 2.2
 */
contract FiatTokenV2_2 is FiatTokenV2_1, ProofOfReserveFeed {
    /**
     * @notice Initialize v2.1
     */
    function initializeV2_2() external {
        // solhint-disable-next-line reason-string
        require(_initializedVersion == 2);

        _initializedVersion = 3;
    }

    function setChainReserveFeed(address newFeed) external override onlyOwner {
        require(newFeed != address(0), "New Feed must not be 0x");

        emit NewChainReserveFeed(chainReserveFeed, newFeed);
        chainReserveFeed = newFeed;
    }

    /**
     * @notice Sets the feed's heartbeat expectation
     * @dev Admin function to set the heartbeat
     * @param newHeartbeat Value of the age of the latest update from the feed
     */
    function setChainReserveHeartbeat(uint256 newHeartbeat)
        external
        override
        onlyOwner
    {
        emit NewChainReserveHeartbeat(chainReserveHeartbeat, newHeartbeat);
        chainReserveHeartbeat = newHeartbeat;
    }

    /**
     * @notice Enable Proof of Reserve check
     * @dev Admin function to enable Proof of Reserve
     */
    function enableProofOfReserve() external override onlyOwner {
        require(chainReserveFeed != address(0), "chainReserveFeed not set");
        require(chainReserveHeartbeat != 0, "chainReserveHeartbeat not set");
        proofOfReserveEnabled = true;
        emit ProofOfReserveEnabled();
    }

    /**
     * @notice Disable Proof of Reserve check
     * @dev Admin function to disable Proof of Reserve
     */
    function disableProofOfReserve() external override onlyOwner {
        proofOfReserveEnabled = false;
        emit ProofOfReserveDisabled();
    }

    /**
     * @notice Overriden mint function that checks the specified proof-of-reserves feed to
     * ensure that the total supply of tokens is not greater than the reported reserves.
     * @dev The proof-of-reserves check is bypassed if feed is not set.
     * @param _to The address to mint tokens to
     * @param _amount The amount of tokens to mint
     * @return A boolean that indicates if the operation was successful.
     */
    function mint(address _to, uint256 _amount)
        external
        override
        whenNotPaused
        onlyMinters
        notBlacklisted(msg.sender)
        notBlacklisted(_to)
        returns (bool)
    {
        // fallback to normal mint.
        if (chainReserveFeed == address(0) || !proofOfReserveEnabled) {
            return super._mint(_to, _amount);
        }

        // Get required info about decimals.
        // Decimals of the Proof of Reserve feed must be the same as the token's.
        require(
            decimals == AggregatorV3Interface(chainReserveFeed).decimals(),
            "Unexpected decimals of PoR feed"
        );

        // Get latest proof-of-reserves from the feed
        (, int256 answer, , uint256 updatedAt, ) = AggregatorV3Interface(
            chainReserveFeed
        )
            .latestRoundData();

        require(answer > 0, "Invalid answer from PoR feed");

        uint256 reserves = uint256(answer);

        // Sanity check: is chainlink answer updatedAt in the past
        require(block.timestamp >= updatedAt, "invalid PoR updatedAt");

        // Check the answer is fresh (within the specified heartbeat)
        require(
            block.timestamp.sub(updatedAt) <= chainReserveHeartbeat,
            "PoR answer is stale"
        );

        // Get required info about total supply.
        // Check that after minting more tokens, the total supply would NOT exceed the reserves
        // reported by the latest valid proof-of-reserves feed.
        require(
            totalSupply_.add(_amount) <= reserves,
            "Total supply would exceed reserves after mint"
        );

        super._mint(_to, _amount);
    }
}
