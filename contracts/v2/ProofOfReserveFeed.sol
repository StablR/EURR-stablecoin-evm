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

abstract contract ProofOfReserveFeed {
    uint256 public chainReserveHeartbeat;
    address public chainReserveFeed;
    bool public proofOfReserveEnabled;

    /**
     * @notice Event emitted when the feed is updated
     */
    event NewChainReserveFeed(address oldFeed, address newFeed);

    /**
     * @notice Event emitted when the heartbeat of chain reserve feed is updated
     */
    event NewChainReserveHeartbeat(uint256 oldHeartbeat, uint256 newHeartbeat);

    /**
     * @notice Event emitted when Proof of Reserve is enabled
     */
    event ProofOfReserveEnabled();

    /**
     * @notice Event emitted when Proof of Reserve is disabled
     */
    event ProofOfReserveDisabled();

    /*** Admin Functions ***/

    /**
     * @notice Sets a new feed address
     * @dev Admin function to set a new feed
     * @param newFeed Address of the new feed
     */
    function setChainReserveFeed(address newFeed) external virtual;

    /**
     * @notice Sets the feed's heartbeat expectation
     * @dev Admin function to set the heartbeat
     * @param newHeartbeat Value of the age of the latest update from the feed
     */
    function setChainReserveHeartbeat(uint256 newHeartbeat) external virtual;

    /**
     * @notice Enable Proof of Reserve check
     * @dev Admin function to enable Proof of Reserve
     */
    function enableProofOfReserve() external virtual;

    /**
     * @notice Disable Proof of Reserve check
     * @dev Admin function to disable Proof of Reserve
     */
    function disableProofOfReserve() external virtual;
}
