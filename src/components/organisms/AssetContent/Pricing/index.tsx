import React, { FormEvent, ReactElement, useRef, useState } from 'react'
import { Formik } from 'formik'
import { initialValues, validationSchema } from '../../../../models/FormPricing'
import { BestPrice, DDO, Logger } from '@oceanprotocol/lib'
import { PriceOptionsMarket } from '../../../../@types/MetaData'
import Alert from '../../../atoms/Alert'
import FormPricing from './FormPricing'
import { toast } from 'react-toastify'
import Feedback from './Feedback'
import { graphql, useStaticQuery } from 'gatsby'
import { usePricing } from '../../../../hooks/usePricing'
import styles from './index.module.css'
import { CancelToken } from 'axios'

const query = graphql`
  query PricingQuery {
    content: allFile(filter: { relativePath: { eq: "price.json" } }) {
      edges {
        node {
          childContentJson {
            create {
              empty {
                title
                info
                action {
                  name
                  help
                }
              }
              fixed {
                title
                info
                tooltips {
                  communityFee
                  marketplaceFee
                }
              }
              dynamic {
                title
                info
                tooltips {
                  poolInfo
                  swapFee
                  communityFee
                  marketplaceFee
                }
              }
              free {
                title
                info
              }
            }
          }
        }
      }
    }
  }
`

export default function Pricing({
  ddo,
  tutorial,
  setShowPriceTutorial,
  refreshDdo
}: {
  ddo: DDO
  tutorial?: boolean
  setShowPriceTutorial?: (value: boolean) => void
  refreshDdo?: (token?: CancelToken) => Promise<void>
}): ReactElement {
  // Get content
  const data = useStaticQuery(query)
  const content = data.content.edges[0].node.childContentJson.create

  // View states
  const [showPricing, setShowPricing] = useState(false)
  const [success, setSuccess] = useState<string>()

  const { createPricing, pricingIsLoading, pricingError, pricingStepText } =
    usePricing()

  const hasFeedback = pricingIsLoading || typeof success !== 'undefined'

  const priceRef = useRef(null)
  const executeScroll = () =>
    priceRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' })

  async function handleCreatePricing(values: PriceOptionsMarket) {
    try {
      const priceOptions = {
        ...values,
        // swapFee is tricky: to get 0.1% you need to send 0.001 as value
        swapFee: `${values.swapFee / 100}`
      }

      const tx = await createPricing(priceOptions, ddo)

      // Pricing failed
      if (!tx || pricingError) {
        toast.error(pricingError || 'Price creation failed.')
        Logger.error(pricingError || 'Price creation failed.')
        return
      }

      // Pricing succeeded
      setSuccess(
        `🎉 Successfully created a ${values.type} price. 🎉 Reload the page to get all updates.`
      )
      Logger.log(`Transaction: ${tx}`)
    } catch (error) {
      toast.error(error.message)
      Logger.error(error.message)
    }
  }

  function handleShowPricingForm(e: FormEvent<HTMLButtonElement>) {
    e.preventDefault()
    setShowPricing(true)
  }

  return (
    <div className={styles.pricing} ref={priceRef}>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        validateOnChange
        onSubmit={async (values, { setSubmitting }) => {
          if (tutorial) {
            executeScroll()
          } else {
            // move user's focus to top of screen
            window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
          }

          // Kick off price creation
          await handleCreatePricing(values)
          if (tutorial) {
            await refreshDdo()
            setShowPriceTutorial(true)
          }
          setSubmitting(false)
        }}
      >
        {hasFeedback ? (
          <Feedback success={success} pricingStepText={pricingStepText} />
        ) : tutorial || showPricing ? (
          <FormPricing
            ddo={ddo}
            setShowPricing={setShowPricing}
            content={content}
          />
        ) : (
          <Alert
            state="info"
            title={content.empty.title}
            text={content.empty.info}
            action={{
              name: content.empty.action.name,
              handleAction: handleShowPricingForm
            }}
          />
        )}
      </Formik>
    </div>
  )
}
