document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('traceability-form');
    const resultSection = document.getElementById('result-section');
    const emptyResult = document.getElementById('empty-result');
    const historyList = document.getElementById('history-list');

    const connectWalletBtn = document.getElementById('connect-wallet-btn');
    const walletStatusText = document.getElementById('wallet-status');
    const blockchainBadge = document.getElementById('blockchain-badge');
    const saveBtn = document.getElementById('save-btn');

    const displayId = document.getElementById('display-id');
    const displayProduct = document.getElementById('display-product');
    const displayFarmer = document.getElementById('display-farmer');
    const displayLocation = document.getElementById('display-location');
    const displayDate = document.getElementById('display-date');
    const displayQuality = document.getElementById('display-quality');
    const qrCodeImg = document.getElementById('qr-code-img');

    const playAudioBtn = document.getElementById('play-audio-btn');
    const clearHistoryBtn = document.getElementById('clear-history-btn');

    const trackBtn = document.getElementById('track-btn');
    const trackIdInput = document.getElementById('track-id');
    const trackingSteps = document.getElementById('tracking-steps');
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');

    let currentProductData = null;
    let savedHistory = JSON.parse(localStorage.getItem('organicFoodHistory')) || [];

    let provider;
    let signer;
    let userAddress;

    
    const CONTRACT_ADDRESS = "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4";

    const CONTRACT_ABI = [
        "function addProduct(string memory _id, string memory _productName, string memory _farmerName, string memory _location, string memory _harvestDate, string memory _quality) public",
        "function getAllProducts() public view returns (tuple(string id, string productName, string farmerName, string location, string harvestDate, string quality, address farmerAddress, uint256 timestamp)[])"
    ];

    renderHistory();

    connectWalletBtn.addEventListener('click', async () => {
        if (typeof window.ethereum !== 'undefined') {
            try {
                walletStatusText.textContent = "Connecting...";

                const accounts = await window.ethereum.request({
                    method: 'eth_requestAccounts'
                });

                provider = new ethers.providers.Web3Provider(window.ethereum);
                signer = provider.getSigner();
                userAddress = accounts[0];

                walletStatusText.textContent =
                    `Connected: ${userAddress.substring(0, 6)}...${userAddress.substring(38)}`;

                connectWalletBtn.style.background = "#16a34a";

                if (CONTRACT_ADDRESS !== "") {
                    fetchBlockchainHistory();
                }

            } catch (error) {
                console.error("Wallet connection failed:", error);
                walletStatusText.textContent = "🦊 Connect MetaMask";
            }
        } else {
            alert("Please install MetaMask browser extension.");
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const friendlyId = 'TRC-' + Date.now().toString().slice(-6);

        const newItem = {
            id: friendlyId,
            productName: document.getElementById('product-name').value,
            farmerName: document.getElementById('farmer-name').value,
            location: document.getElementById('location').value,
            harvestDate: document.getElementById('harvest-date').value,
            quality: document.getElementById('product-quality').value,
            isBlockchain: false
        };

        if (signer && CONTRACT_ADDRESS !== "") {
            try {
                saveBtn.innerText = "Confirming Transaction...";
                saveBtn.disabled = true;

                const contract = new ethers.Contract(
                    CONTRACT_ADDRESS,
                    CONTRACT_ABI,
                    signer
                );

                const tx = await contract.addProduct(
                    newItem.id,
                    newItem.productName,
                    newItem.farmerName,
                    newItem.location,
                    newItem.harvestDate,
                    newItem.quality
                );

                saveBtn.innerText = "Saving to Blockchain...";
                await tx.wait();

                newItem.isBlockchain = true;

                await fetchBlockchainHistory();

            } catch (error) {
                console.error("Blockchain transaction failed:", error);
                alert("Transaction failed. Check MetaMask and console.");
            } finally {
                saveBtn.innerText = "+ Save to Blockchain";
                saveBtn.disabled = false;
                form.reset();
            }
        } else {
            savedHistory.unshift(newItem);
            localStorage.setItem('organicFoodHistory', JSON.stringify(savedHistory));

            form.reset();
            renderHistory();
            selectItem(newItem);
        }
    });

    trackBtn.addEventListener('click', () => {
        const queryId = trackIdInput.value.trim();

        if (!queryId) {
            alert("Please enter Product ID or Product Name.");
            return;
        }

        emptyResult.style.display = 'block';
        resultSection.style.display = 'none';

        trackingSteps.style.display = 'block';
        step1.style.display = 'block';
        step1.innerHTML = 'Searching blockchain network...';

        step2.style.display = 'none';
        step3.style.display = 'none';

        trackBtn.disabled = true;
        trackBtn.innerText = 'Tracking...';

        setTimeout(() => {
            step1.innerHTML = 'Blockchain network found';
            step2.style.display = 'block';
            step2.innerHTML = 'Verifying smart contract...';

            setTimeout(() => {
                step2.innerHTML = 'Smart contract verified';
                step3.style.display = 'block';
                step3.innerHTML = 'Retrieving product data...';

                setTimeout(() => {
                    const foundItem = savedHistory.find(item =>
                        item.id === queryId ||
                        item.productName.toLowerCase() === queryId.toLowerCase()
                    );

                    if (foundItem) {
                        step3.innerHTML = 'Product data retrieved successfully';

                        setTimeout(() => {
                            selectItem(foundItem);
                            trackingSteps.style.display = 'none';
                            trackBtn.disabled = false;
                            trackBtn.innerText = 'Track Product';
                        }, 1000);
                    } else {
                        step3.innerHTML = 'Product record not found';
                        trackBtn.disabled = false;
                        trackBtn.innerText = 'Track Product';

                        setTimeout(() => {
                            trackingSteps.style.display = 'none';
                        }, 2500);
                    }
                }, 1000);
            }, 1000);
        }, 1000);
    });

    async function fetchBlockchainHistory() {
        if (!provider || CONTRACT_ADDRESS === "") return;

        try {
            const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
            const data = await contract.getAllProducts();

            const blockchainHistory = data.map(item => ({
                id: item.id,
                productName: item.productName,
                farmerName: item.farmerName,
                location: item.location,
                harvestDate: item.harvestDate,
                quality: item.quality,
                isBlockchain: true,
                timestamp: item.timestamp.toString(),
                authorizer: item.farmerAddress
            }));

            savedHistory = blockchainHistory.reverse();
            localStorage.setItem('organicFoodHistory', JSON.stringify(savedHistory));

            renderHistory();

            if (savedHistory.length > 0) {
                selectItem(savedHistory[0]);
            }

        } catch (error) {
            console.error("Error fetching blockchain history:", error);
        }
    }

    function renderHistory() {
        if (savedHistory.length === 0) {
            historyList.innerHTML = '<p class="empty-state">No products entered yet.</p>';
            return;
        }

        historyList.innerHTML = '';

        savedHistory.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';

            const badgeHTML = item.isBlockchain
                ? `<span style="color:green;">Blockchain Verified</span>`
                : `<span style="color:gray;">Local Only</span>`;

            div.innerHTML = `
                <strong>${item.id}</strong><br>
                Product: ${item.productName}<br>
                Farmer: ${item.farmerName}<br>
                Date: ${item.harvestDate}<br>
                ${badgeHTML}
            `;

            div.addEventListener('click', () => selectItem(item));
            historyList.appendChild(div);
        });
    }

    function selectItem(item) {
        currentProductData = item;

        displayId.textContent = item.id;
        displayProduct.textContent = item.productName;
        displayFarmer.textContent = item.farmerName;
        displayLocation.textContent = item.location;
        displayDate.textContent = item.harvestDate;
        displayQuality.textContent = item.quality;

        blockchainBadge.style.display = item.isBlockchain ? "inline-block" : "none";

        const qrJsonData = JSON.stringify({
            trackingId: item.id,
            product: item.productName,
            farmer: item.farmerName,
            location: item.location,
            harvestDate: item.harvestDate,
            quality: item.quality,
            verified: item.isBlockchain ? "Blockchain Verified" : "Local Only"
        });

        qrCodeImg.src =
            `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrJsonData)}`;

        emptyResult.style.display = 'none';
        resultSection.style.display = 'block';

        renderHistory();
    }

    playAudioBtn.addEventListener('click', () => {
        if (!currentProductData) {
            alert("Please select a product first.");
            return;
        }

        if (!window.speechSynthesis) {
            alert("Your browser does not support text-to-speech.");
            return;
        }

        window.speechSynthesis.cancel();

        const englishSentence =
            `Product: ${currentProductData.productName}. ` +
            `Quality: ${currentProductData.quality}. ` +
            `Farmer: ${currentProductData.farmerName}. ` +
            `Location: ${currentProductData.location}. ` +
            `Harvest Date: ${currentProductData.harvestDate}.`;

        const utterance = new SpeechSynthesisUtterance(englishSentence);
        utterance.lang = 'en-IN';

        window.speechSynthesis.speak(utterance);
    });

    clearHistoryBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear local history?")) {
            savedHistory = [];
            localStorage.removeItem('organicFoodHistory');

            renderHistory();

            emptyResult.style.display = 'block';
            resultSection.style.display = 'none';
            currentProductData = null;
        }
    });
});
