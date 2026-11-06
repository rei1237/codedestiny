// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Each batch commits to one contiguous range of workshop certificates.
contract BatchRegistry {
    address public issuer = msg.sender;
    struct Series { uint32 cap; uint32 published; uint32 batches; }
    struct Batch { uint32 first; uint32 last; bytes32 root; uint256 height; }
    mapping(bytes32 => Series) public series;
    mapping(bytes32 => mapping(uint256 => Batch)) public batch;
    event Sealed(bytes32 indexed id, uint32 cap);
    event Committed(bytes32 indexed id, uint32 first, uint32 last, uint32 cap, bytes32 root);

    function seal(bytes32 id, uint32 cap) public {
        require(msg.sender == issuer && id != 0 && cap > 0 && series[id].cap == 0, "invalid seal");
        series[id].cap = cap;
        emit Sealed(id, cap);
    }
    function commit(bytes32 id, uint32 cap, uint32 first, uint32 last, bytes32 root) external {
        require(msg.sender == issuer, "issuer only");
        Series storage s = series[id];
        if (s.cap == 0) seal(id, cap);
        require(s.cap == cap && first == s.published + 1 && last >= first && last <= cap && root != 0, "invalid range");
        batch[id][++s.batches] = Batch(first, last, root, block.number);
        s.published = last;
        emit Committed(id, first, last, cap, root);
    }
}
