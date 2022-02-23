/**
 * SPDX-License-Identifier: MIT
 *
 * Copyright (c) 2018-2021 CENTRE SECZ
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

contract ContractWithPublicFunctions {
    string private _foo;
    uint256 private _bar;

    function setFoo(string memory foo) public returns (bool) {
        _foo = foo;
        return true;
    }

    function getFoo() public view returns (string memory) {
        return _foo;
    }

    function setBar(uint256 bar) public returns (bool) {
        _bar = bar;
        return true;
    }

    function getBar() public view returns (uint256) {
        return _bar;
    }

    function hushLinters() external {
        require(setFoo(getFoo()), "hush");
        require(setBar(getBar()), "hush");
    }
}
