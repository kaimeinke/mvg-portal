import { Formik } from 'formik'
import React, { ReactElement, useState } from 'react'
import { MetadataEditForm } from '../../../../@types/MetaData'
import {
  validationSchema,
  getInitialValues
} from '../../../../models/FormEditMetadata'
import {
  edgeValidationSchema,
  getInitialEdgeValues
} from '../../../../models/FormEditEdgeMetadata'
import { useAsset } from '../../../../providers/Asset'
import { useUserPreferences } from '../../../../providers/UserPreferences'
import { MetadataPreview } from '../../../molecules/MetadataPreview'
import Debug from './DebugEditMetadata'
import Web3Feedback from '../../../molecules/Web3Feedback'
import FormEditMetadata from './FormEditMetadata'
import {
  mapTimeoutStringToSeconds,
  updateServiceSelfDescription
} from '../../../../utils/metadata'
import styles from './index.module.css'
import { EditableMetadata, Logger } from '@oceanprotocol/lib'
import MetadataFeedback from '../../../molecules/MetadataFeedback'
import { graphql, useStaticQuery } from 'gatsby'
import { useWeb3 } from '../../../../providers/Web3'
import { useOcean } from '../../../../providers/Ocean'
import {
  setMinterToDispenser,
  setMinterToPublisher
} from '../../../../utils/freePrice'
import FormEditEdgeMetadata from './FormEditEdgeMetadata'

const contentQuery = graphql`
  query EditMetadataQuery {
    content: allFile(filter: { relativePath: { eq: "pages/edit.json" } }) {
      edges {
        node {
          childPagesJson {
            description
            form {
              success
              successAction
              error
              data {
                name
                placeholder
                label
                help
                type
                min
                required
                sortOptions
                options
                rows
              }
            }
          }
        }
      }
    }
    edgeContent: allFile(
      filter: { relativePath: { eq: "pages/editEdge.json" } }
    ) {
      edges {
        node {
          childPagesJson {
            description
            form {
              success
              successAction
              error
              data {
                name
                placeholder
                label
                help
                type
                min
                required
                sortOptions
                options
                rows
              }
            }
          }
        }
      }
    }
  }
`

export default function Edit({
  setShowEdit,
  isComputeType,
  isEdge
}: {
  setShowEdit: (show: boolean) => void
  isComputeType?: boolean
  isEdge?: boolean
}): ReactElement {
  const data = useStaticQuery(contentQuery)
  const content = isEdge
    ? data.edgeContent.edges[0].node.childPagesJson
    : data.content.edges[0].node.childPagesJson

  const { debug } = useUserPreferences()
  const { accountId } = useWeb3()
  const { ocean } = useOcean()
  const { metadata, ddo, refreshDdo, price } = useAsset()
  const [success, setSuccess] = useState<string>()
  const [error, setError] = useState<string>()
  const [timeoutStringValue, setTimeoutStringValue] = useState<string>()
  const timeout = isEdge
    ? undefined
    : ddo.findServiceByType('access')
    ? ddo.findServiceByType('access').attributes.main.timeout
    : ddo.findServiceByType('compute').attributes.main.timeout

  const hasFeedback = error || success

  async function updateFixedPrice(newPrice: number) {
    const setPriceResp = await ocean.fixedRateExchange.setRate(
      price.address,
      newPrice,
      accountId
    )
    if (!setPriceResp) {
      setError(content.form.error)
      Logger.error(content.form.error)
    }
  }

  async function handleSubmit(
    values: Partial<MetadataEditForm>,
    resetForm: () => void
  ) {
    try {
      if (price.type === 'free') {
        const tx = await setMinterToPublisher(
          ocean,
          ddo.dataToken,
          accountId,
          setError
        )
        if (!tx) return
      }
      // Construct new DDO with new values
      const updatedValues: EditableMetadata = {
        title: values?.name || '',
        description: values?.description || '',
        author: values?.author || ''
      }
      if (!isEdge) {
        updatedValues.links =
          typeof values.links !== 'string' ? values.links : []
      }

      const ddoEditedMetadata = await ocean.assets.editMetadata(
        ddo,
        updatedValues
      )

      price.type === 'exchange' &&
        values.price !== price.value &&
        (await updateFixedPrice(values.price))

      if (!ddoEditedMetadata) {
        setError(content.form.error)
        Logger.error(content.form.error)
        return
      }

      // Manually add service self-description since the value is not
      // updated in ocean.assets.editMetadata()
      let ddoEdited = values?.serviceSelfDescription
        ? updateServiceSelfDescription(
            ddoEditedMetadata,
            values.serviceSelfDescription[0]
          )
        : ddoEditedMetadata
      if (!isEdge && timeoutStringValue !== values.timeout) {
        const service =
          ddoEditedMetadata.findServiceByType('access') ||
          ddoEditedMetadata.findServiceByType('compute')
        const timeout = mapTimeoutStringToSeconds(values.timeout)
        ddoEdited = await ocean.assets.editServiceTimeout(
          ddoEditedMetadata,
          service.index,
          timeout
        )
      }

      if (!ddoEdited) {
        setError(content.form.error)
        Logger.error(content.form.error)
        return
      }

      const storedDdo = await ocean.assets.updateMetadata(ddoEdited, accountId)
      if (!storedDdo) {
        setError(content.form.error)
        Logger.error(content.form.error)
        return
      } else {
        if (price.type === 'free') {
          const tx = await setMinterToDispenser(
            ocean,
            ddo.dataToken,
            accountId,
            setError
          )
          if (!tx) return
        }
        // Edit succeeded
        setSuccess(content.form.success)
        resetForm()
      }
    } catch (error) {
      Logger.error(error.message)
      setError(error.message)
    }
  }

  return (
    <Formik
      initialValues={
        isEdge
          ? getInitialEdgeValues(metadata)
          : getInitialValues(metadata, timeout, price.value)
      }
      validationSchema={isEdge ? edgeValidationSchema : validationSchema}
      onSubmit={async (values, { resetForm }) => {
        // move user's focus to top of screen
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
        // kick off editing
        await handleSubmit(values, resetForm)
      }}
    >
      {({ isSubmitting, values, initialValues }) =>
        isSubmitting || hasFeedback ? (
          <MetadataFeedback
            title="Updating Data Set"
            error={error}
            success={success}
            setError={setError}
            successAction={{
              name: content.form.successAction,
              onClick: async () => {
                await refreshDdo()
                setShowEdit(false)
              }
            }}
          />
        ) : (
          <>
            <p className={styles.description}>{content.description}</p>
            <article className={styles.grid}>
              {isEdge ? (
                <FormEditEdgeMetadata
                  data={content.form.data}
                  setShowEdit={setShowEdit}
                />
              ) : (
                <FormEditMetadata
                  data={content.form.data}
                  setShowEdit={setShowEdit}
                  setTimeoutStringValue={setTimeoutStringValue}
                  values={initialValues}
                  showPrice={price.type === 'exchange'}
                  isComputeDataset={isComputeType}
                />
              )}
              <aside>
                <MetadataPreview values={values} />
                <Web3Feedback />
              </aside>

              {debug === true && <Debug values={values} ddo={ddo} />}
            </article>
          </>
        )
      }
    </Formik>
  )
}
