// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// Non-upgradeable, issuer-held ERC-721. There is no burn, allowance or transfer path.
contract Edition {
    address public immutable issuer = msg.sender;
    struct Series { uint32 cap; uint32 issued; bytes32 work; }
    mapping(bytes32 => Series) public series;
    mapping(uint256 => bool) private exists;
    uint256 private count;
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event Issued(bytes32 indexed id, uint32 indexed serial, uint256 tokenId, bytes32 codeHash);
    event Sealed(bytes32 indexed id, uint32 cap, bytes32 work);
    event Voided(uint256 indexed tokenId, bytes32 reason);
    mapping(uint256 => bytes32) public invalidation;
    modifier onlyIssuer() { require(msg.sender == issuer, "issuer only"); _; }
    function seal(bytes32 id, uint32 cap, bytes32 work) external onlyIssuer {
        require(cap > 0 && work != 0 && series[id].cap == 0, "invalid series");
        series[id] = Series(cap, 0, work);
        emit Sealed(id, cap, work);
    }
    function number(bytes32 id, uint32 serial) public pure returns (uint256) {
        return uint256(keccak256(abi.encode(id, serial)));
    }
    function mint(bytes32 id, uint32 serial, bytes32 codeHash) external onlyIssuer {
        require(codeHash != 0, "missing certificate");
        Series storage s = series[id];
        require(serial > 0 && serial <= s.cap && serial == s.issued + 1, "invalid serial");
        uint256 token = number(id, serial);
        require(!exists[token], "already issued");
        exists[token] = true; s.issued = serial; count++;
        emit Transfer(address(0), issuer, token); emit Issued(id, serial, token, codeHash);
    }
    function invalidate(uint256 token, bytes32 reason) external onlyIssuer {
        require(exists[token] && reason != 0 && invalidation[token] == 0, "invalid token");
        invalidation[token] = reason; emit Voided(token, reason);
    }
    function supportsInterface(bytes4 i) external pure returns (bool) { return i == 0x01ffc9a7 || i == 0x80ac58cd; }
    function ownerOf(uint256 token) public view returns (address) { require(exists[token]); return issuer; }
    function balanceOf(address owner) external view returns (uint256) { require(owner != address(0)); return owner == issuer ? count : 0; }
    function getApproved(uint256 token) external view returns (address) { ownerOf(token); return address(0); }
    function isApprovedForAll(address,address) external pure returns (bool) { return false; }
    function approve(address,uint256) external pure { revert("locked"); }
    function setApprovalForAll(address,bool) external pure { revert("locked"); }
    function transferFrom(address,address,uint256) external pure { revert("locked"); }
    function safeTransferFrom(address,address,uint256) external pure { revert("locked"); }
    function safeTransferFrom(address,address,uint256,bytes calldata) external pure { revert("locked"); }
}
