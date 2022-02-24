import { SubstrateEvent } from '@subql/types'
import { Vaults, VaultsDissolve } from '../../types'
import { ensureStrNumber } from '../utils/decimalts'

export function aggregateIntoId(
  paraId: string,
  leaseStart: string,
  leaseEnd: string
) {
  return paraId + '-' + leaseStart + '-' + leaseEnd
}

export const handleVaultCreated = async ({
  event: { data },
  block: {
    block: { header }
  }
}: SubstrateEvent) => {
  const [
    paraId,
    vaultId,
    ctokenId,
    phase,
    contributionStrategy,
    cap,
    endBlock,
    _
  ] = JSON.parse(data.toString()) as [
    number,
    number[],
    number,
    string,
    string,
    string,
    number,
    number
  ]
  const vaultRecord = Vaults.create({
    id: aggregateIntoId(
      paraId.toString(),
      vaultId[0].toString(),
      vaultId[1].toString()
    ),
    createdAt: header.number.toNumber(),
    paraId,
    ctokenId,
    phase,
    contributions: 0,
    totalAmount: '0',
    contributionStrategy,
    cap: ensureStrNumber(cap),
    endBlock: endBlock
  })

  try {
    await vaultRecord.save()

    logger.info(
      `#${header.number.toNumber()} handle VaultCreated ${JSON.stringify(
        vaultRecord
      )}`
    )
  } catch (error) {
    logger.error('handle VaultCreated error: ', error)
  }
}

export const handleVaultUpdated = async ({
  event: { data },
  block: {
    block: { header }
  }
}: SubstrateEvent) => {
  const [paraId, vaultId, contributionStrategy, cap, endBlock] = JSON.parse(
    data.toString()
  ) as [number, number[], string, string, number]

  let vault = aggregateIntoId(
    paraId.toString(),
    vaultId[0].toString(),
    vaultId[1].toString()
  )
  let vaultRecord = await Vaults.get(vault)
  if (vaultRecord) {
    vaultRecord.contributionStrategy = contributionStrategy
    ;(vaultRecord.cap = ensureStrNumber(cap)), (vaultRecord.endBlock = endBlock)
  } else {
    logger.error(
      `cannot update the vault which is not found: ${JSON.stringify(vault)}`
    )
  }

  try {
    await vaultRecord.save()

    logger.info(
      `#${header.number.toNumber()} handle VaultUpdated: ${JSON.stringify(
        vaultRecord
      )}`
    )
  } catch (error) {
    logger.error('handle VaultUpdated error: ', error)
  }
}

export const handleVaultPhaseUpdated = async ({
  event: { data },
  block: {
    block: { header }
  }
}: SubstrateEvent) => {
  const [paraId, vaultId, prePhase, curPhase] = JSON.parse(data.toString()) as [
    number,
    number[],
    string,
    string
  ]

  let vault = aggregateIntoId(
    paraId.toString(),
    vaultId[0].toString(),
    vaultId[1].toString()
  )
  let vaultRecord = await Vaults.get(vault)
  if (vaultRecord) {
    vaultRecord.phase = curPhase
  } else {
    logger.error(
      `cannot update the vault which is not found: ${JSON.stringify(vault)}`
    )
  }

  try {
    await vaultRecord.save()

    logger.info(
      `#${header.number.toNumber()} handle VaultPhaseUpdated: ${JSON.stringify(
        vaultRecord
      )}`
    )
  } catch (error) {
    logger.error('handle VaultPhaseUpdated error: ', error)
  }
}

export const handleVaultDissolved = async ({
  idx,
  event: { data },
  block: {
    block: { header }
  }
}: SubstrateEvent) => {
  const [paraId, vaultId] = JSON.parse(data.toString()) as [number, number[]]

  let aggregateVaultId = aggregateIntoId(
    paraId.toString(),
    vaultId[0].toString(),
    vaultId[1].toString()
  )
  try {
    await VaultsDissolve.create({
      id: idx.toString(),
      vaultId: aggregateVaultId,
      dissolvedBlockHeight: header.number.toNumber()
    }).save()

    let vault = await Vaults.get(aggregateVaultId)
    vault.phase = 'Cancelled'
    await vault.save()
    logger.info(`#${header.number.toNumber()} handle VaultDissolved: ${vault}`)
  } catch (error) {
    logger.error('handle VaultDissolved error: ', error)
  }
}

export const updateVaultSummary = async (vault: string, amount: string) => {
  let vaultRecord = await Vaults.get(vault)
  if (vaultRecord) {
    vaultRecord.contributions += 1
    vaultRecord.totalAmount = ensureStrNumber(
      (BigInt(vaultRecord.totalAmount) + BigInt(amount)).toString()
    )
  } else {
    logger.error(
      `Cannot update the vault which is not found: ${JSON.stringify(vault)}`
    )
  }

  try {
    await vaultRecord.save()
    logger.info(`handle VaultSummaryUpdated: ${JSON.stringify(vaultRecord)}`)
  } catch (error) {
    logger.error('handle VaultSummary error: ', error)
  }
}
