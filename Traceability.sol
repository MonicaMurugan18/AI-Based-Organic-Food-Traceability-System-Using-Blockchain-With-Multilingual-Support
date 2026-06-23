// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Traceability {

    struct Product {
        string id;
        string productName;
        string farmerName;
        string location;
        string harvestDate;
        string quality;
        address farmerAddress;
        uint256 timestamp;
    }

    Product[] public products;

    event ProductAdded(
        string id,
        string productName,
        address indexed farmer
    );

    function addProduct(
        string memory _id,
        string memory _productName,
        string memory _farmerName,
        string memory _location,
        string memory _harvestDate,
        string memory _quality
    ) public {
        products.push(Product({
            id: _id,
            productName: _productName,
            farmerName: _farmerName,
            location: _location,
            harvestDate: _harvestDate,
            quality: _quality,
            farmerAddress: msg.sender,
            timestamp: block.timestamp
        }));

        emit ProductAdded(_id, _productName, msg.sender);
    }

    function getAllProducts() public view returns (Product[] memory) {
        return products;
    }
}
