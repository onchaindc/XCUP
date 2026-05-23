// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title X Cup Arena
/// @notice Minimal hackathon contract for World Cup-themed prediction tickets,
/// squad membership, NFT mint intent proofs, and agent briefings on X Layer.
contract XCupArena {
    enum EventType {
        Prediction,
        Squad,
        MintIntent,
        AgentBriefing
    }

    struct FanEvent {
        address fan;
        EventType eventType;
        bytes32 fixtureId;
        bytes32 marketId;
        bytes32 payloadHash;
        uint256 stake;
        uint256 createdAt;
    }

    address public immutable owner;
    uint256 public eventCount;

    mapping(uint256 => FanEvent) public eventsById;
    mapping(address => uint256) public fanScore;
    mapping(bytes32 => uint256) public marketVolume;
    mapping(bytes32 => uint256) public squadScore;

    event FanEventRecorded(
        uint256 indexed eventId,
        address indexed fan,
        EventType indexed eventType,
        bytes32 fixtureId,
        bytes32 marketId,
        bytes32 payloadHash,
        uint256 stake
    );

    error EmptyPayload();
    error EmptySquad();

    constructor() {
        owner = msg.sender;
    }

    function preparePrediction(
        bytes32 fixtureId,
        bytes32 marketId,
        bytes32 payloadHash
    ) external payable returns (uint256 eventId) {
        if (payloadHash == bytes32(0)) {
            revert EmptyPayload();
        }

        eventId = _record(EventType.Prediction, fixtureId, marketId, payloadHash, msg.value);
        marketVolume[marketId] += msg.value;
        fanScore[msg.sender] += 30 + msg.value / 1e15;
    }

    function joinSquad(bytes32 squadId, bytes32 payloadHash) external returns (uint256 eventId) {
        if (squadId == bytes32(0)) {
            revert EmptySquad();
        }
        if (payloadHash == bytes32(0)) {
            revert EmptyPayload();
        }

        eventId = _record(EventType.Squad, squadId, bytes32(0), payloadHash, 0);
        squadScore[squadId] += 1;
        fanScore[msg.sender] += 12;
    }

    function recordMintIntent(bytes32 collectibleId, bytes32 payloadHash) external returns (uint256 eventId) {
        if (payloadHash == bytes32(0)) {
            revert EmptyPayload();
        }

        eventId = _record(EventType.MintIntent, collectibleId, bytes32(0), payloadHash, 0);
        fanScore[msg.sender] += 20;
    }

    function recordAgentBriefing(
        bytes32 fixtureId,
        bytes32 briefingHash
    ) external returns (uint256 eventId) {
        if (briefingHash == bytes32(0)) {
            revert EmptyPayload();
        }

        eventId = _record(EventType.AgentBriefing, fixtureId, bytes32(0), briefingHash, 0);
        fanScore[msg.sender] += 8;
    }

    function _record(
        EventType eventType,
        bytes32 fixtureId,
        bytes32 marketId,
        bytes32 payloadHash,
        uint256 stake
    ) internal returns (uint256 eventId) {
        eventId = ++eventCount;
        eventsById[eventId] = FanEvent({
            fan: msg.sender,
            eventType: eventType,
            fixtureId: fixtureId,
            marketId: marketId,
            payloadHash: payloadHash,
            stake: stake,
            createdAt: block.timestamp
        });

        emit FanEventRecorded(eventId, msg.sender, eventType, fixtureId, marketId, payloadHash, stake);
    }
}
